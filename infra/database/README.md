# USERS table

Use the existing FREEPDB1 and STORE_JDBC account. Start the existing Compose database
if needed; do not remove its volume. Credentials remain in the Git-ignored root `.env`
or exported environment, using the same loader as schema setup.

```sh
docker compose up -d --wait --wait-timeout 600 oracle
python3 infra/database/setup.py --users-table
# Repeat to validate the existing-table path:
python3 infra/database/setup.py --users-table
```

`--users-table` first verifies the STORE_JDBC login, then executes `users.sql` and
`verify_users.sql` as that application user. It does not rerun user provisioning,
change passwords, or alter an existing table. An absent account must be provisioned
with the separate schema setup command first.

`users.sql` creates USERS only when absent, using a bind populated by the Python
helper from the canonical `tables/users.sql` DDL. That same file is packaged for the
opt-in development startup reset; edit table definitions there only. Do not execute
`users.sql` standalone without its DDL bind. The table defines a NUMBER GENERATED ALWAYS AS
IDENTITY primary key; CHAR-length VARCHAR2 columns; non-null columns; named checks
rejecting space-only name, lastname and password_hash; the named USERS_EMAIL_UK
constraint; and timestamp-with-time-zone defaults. Oracle creates the unique
constraint's backing index, so no separate email index is created. Email uniqueness
uses the database's normal comparison semantics; no normalization is added.
There is no updated_at trigger. Future application updates must set that timestamp.

The manual command above remains non-destructive for an existing table. The separate
`dev` runtime reset (`DEV_DB_RESET=true`) deliberately drops PRODUCTS before USERS and rebuilds USERS before PRODUCTS
in the verified local STORE_JDBC / FREEPDB1 connection and inserts deterministic
read-development fixtures. See the root README for profile commands and safeguards.
Production never runs this reset.

For an existing table, metadata checks report discrepancies and fail instead of
silently skipping it or altering data. Checks cover column count/order/type/CHAR
length/nullability, identity generation, defaults, enabled and validated constraints,
primary/unique key columns, the named email unique constraint, both backing indexes,
redundant indexes, and unexpected checks/triggers. Expression checks normalize
whitespace, parentheses and identifier quoting; other equivalent definitions can be
reported as discrepancies for manual review. This is a validator, not an automatic
migration tool. Oracle table DDL commits independently of the insert checks.

The verification script prints metadata and tests generated IDs and timestamp defaults,
duplicate email, every explicit non-ID NULL, all three space-only values, all four
VARCHAR2 length limits, and explicit assignment to the generated identity. It asserts
the expected Oracle error codes. All inserted probe rows are rolled back on success
or failure, with a post-rollback check on success. Identity sequence values are not
transactional: testing can leave harmless gaps in IDs. Existing rows are not modified.

Local Oracle setup and rollback-only verification have since completed successfully.

## PRODUCTS table

```sh
python3 infra/database/setup.py --products-table
```

Run after USERS exists. This command uses the canonical `tables/products.sql`,
creates only an absent PRODUCTS table and its nonunique `products_user_id_idx`,
and never drops or alters existing tables or rows. Existing PRODUCTS is preserved;
verification reports metadata and checks identity, index and foreign key behavior.
DDL commits independently; if index creation fails, inspect and repair the index
before rerunning (existing tables are never automatically altered).

PRODUCTS uses the same NUMBER ALWAYS identity as USERS, a required NUMBER user_id,
VARCHAR2(50 CHAR) title, NUMBER(12,2) price, optional CLOB description, and
NUMBER(10,0) stock defaulting to zero. Required columns, primary/foreign keys,
nonnegative checks and indexes have explicit names. The foreign key has no cascade.
`verify_products.sql` checks multiple products for one user, identity/defaults,
invalid user_id, negative price/stock, required numeric fields and blocked parent
deletion using rollback-only probes. Identity gaps may remain after verification.

The opt-in development reset recreates both tables and the products index in
foreign-key dependency order. Ordinary startup does not initialize either table.
Local Oracle PRODUCTS verification has since completed successfully; see publication-status migration verification below.

## Publication statuses and existing-database migration

Stop application writes for this manual local migration, then run:

```sh
python3 infra/database/setup.py --product-statuses
```

This uses the existing SQL*Plus helper, not a new migration framework. It creates
`product_statuses` using `tables/product_statuses.sql` and seeds the canonical
`tables/product_statuses_seed.sql`: 1 / ACTIVE / Activo, 2 / INACTIVE / Inactivo,
3 / DELETED / Eliminado. Conflicting fixed lookup values fail without overwriting them.
The lookup codes are stable; catalog SQL resolves ACTIVE by code, not numeric ID.

`migrate_product_statuses.sql` adds nullable status_id, backfills only unassigned
rows (positive stock -> ACTIVE, zero stock -> INACTIVE), then makes it required,
sets the INACTIVE default and adds a noncascading foreign key. It preserves existing
rows and all original fields; the script compares pre/post product snapshots,
including CLOB contents, and verifies the initial assignment. Reruns keep assigned
statuses, including paused and deleted products; nulls from an interrupted run are
backfilled to allow recovery. Oracle DDL commits implicitly, so this is not an atomic
rollback migration. Run with writes stopped; snapshot memory grows with the local
catalog. Inspect any failure before retrying.

Fresh manual setup (`--users-table` then `--products-table`) creates the same lookup,
seeds, and product structure. The opt-in destructive dev reset drops PRODUCTS first,
then PRODUCT_STATUSES and USERS, recreates the schema in dependency order, and seeds
the same fixed statuses. Normal startup does not migrate existing databases.

Catalog listing and lookup require both ACTIVE code and stock > 0, in SQL before
pagination. Hidden products return the existing not-found error / HTTP 404. Public
fields, zero-based pagination, and anonymous GET access are unchanged. There is no
total-count query or totals response in the current API; no new total is introduced.
Any future count query must use the identical visibility predicate.

Future write operations must enforce these rules in the application/domain layer:
ACTIVE requires positive stock; INACTIVE may be explicitly reactivated; DELETED is
soft deletion and remains DELETED regardless of stock. Positive stock and restocking
must never automatically publish a paused or deleted product. Save stock and status
changes in the same transaction. The database keeps stock >= 0 and the status foreign
key; it has no cross-table publication check, triggers, or cascading deletes.
A legacy ACTIVE/zero-stock row is defensively hidden by catalog reads.

Local Oracle migration verification preserved 6 products (5 ACTIVE, 1 INACTIVE),
checked the initial statuses against their original stock, and validated required
status, default, foreign keys, visibility filtering, and pagination using rollback-only
probes. Reruns also verified that existing statuses and product data were preserved. H2 tests separately
exercise catalog visibility, pagination, hidden-product 404s, and fresh canonical DDL;
mock-based tests cover dev-reset ordering and HTTP/security contracts.
