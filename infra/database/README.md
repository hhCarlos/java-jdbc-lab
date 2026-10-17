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

Live execution was attempted during implementation but Docker returned permission
denied on its socket. SQL execution, insert checks, and rerun behavior therefore remain
unverified against Oracle until the commands above complete successfully.

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
Live Oracle verification of PRODUCTS was attempted but Docker socket access was
denied; the Oracle checks have not been executed in this environment.
