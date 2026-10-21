# Architecture and operations

[Project setup](../../README.md) · [Frontend development](../../front-end/README.md)

## Repository map

```text
src/main/java/com/example/jdbclab/
  auth/                     Registration, login, password and JWT adapters
  users/                    Public user reads, current-user resolution, registration persistence
  products/                 Owner product management and publication rules
  catalog/                  Anonymous visible-product reads
  infrastructure/           Application entry point, runtime profiles, global HTTP errors
src/main/resources/         Shared, dev and prod configuration
src/test/                   Backend behavior and architecture tests
front-end/
  src/app/features/         Auth, profile and products
  src/app/layouts/          Shell, sidebar and notifications
  src/app/shared/           Reusable controls and loader
  src/styles/               SCSS tokens, base rules and themes
infra/database/             Local setup, verification, migration and canonical tables/ SQL
infra/demo/                 Disposable Oracle image, initialization hook and readiness check
scripts/                    Local connection verification and demo entry point
.run/                       Shared IntelliJ launch configurations
.github/workflows/          Backend and frontend CI
docs/                       Architecture, database model/rules and agent workflow
```

## Backend boundaries

One Maven/Spring Boot application is organized by feature. Each feature has:

| Layer | Responsibility |
| --- | --- |
| `domain` | Framework-free models and business value rules |
| `application` | Use cases, repository/security ports, projections and application exceptions |
| `infrastructure` | JDBC adapters, HTTP DTOs/controllers, security, transaction boundaries and Spring wiring |

Dependencies point inward: `infrastructure -> application -> domain`. Inner layers
use Java types and inner contracts rather than Spring, HTTP, JDBC, BCrypt or JWT APIs.
The root `infrastructure` package supplies application composition and global error
handling. `JdbcLabApplication` scans `com.example.jdbclab`; features do not import
the composition root or another feature's infrastructure.

Auth uses users' application/domain contracts for registration. The users JDBC
adapter owns public user persistence and registration writes; the auth credential
adapter reads a separate credential projection. Auth and users keep their own HTTP
response DTOs, avoiding cross-feature transport imports. The products controller
uses `UserService` to resolve the authenticated owner. Catalog owns its read model
and JDBC query rather than depending on owner-management infrastructure.

Spring Boot supplies the DataSource, Hikari pool, JdbcTemplate and transaction
manager. Registration transactions live in the users persistence adapter; product
write transactions are applied by `TransactionalProductService` in infrastructure.
These are package boundaries within one deployment and database.

`ArchitectureTest` checks package/source alignment and selected dependency rules;
HTTP, security, profile, and persistence tests cover behavior separately. H2 and
mock tests do not verify live Oracle connectivity or Oracle-specific generated keys.

## API and frontend organization

Auth exposes public registration/login. Registration creates a BCrypt-backed account
without logging it in. Login issues an HS256 JWT; protected reads use Bearer tokens.
The user API provides list, ID and current-user reads without credential fields.
Products resolves ownership from the authenticated database user, supports owner
list/detail/create/replace/soft-delete, and excludes deleted products. Catalog
list/detail reads are public and require ACTIVE status plus positive stock before
pagination. Publication and migration rules are documented in the
[database guide](../../infra/database/README.md#publication-statuses-and-existing-database-migration).

The Angular application uses standalone components and lazy routes. Auth routes
live under `/auth`; `/app` and its children use auth guards. The profile child route currently has an empty view. Sessions are held in memory,
so page reload requires login again. Feature services/models
are colocated with auth and products. Layouts own the shell, sidebar and
notifications; shared components provide reusable controls and the blocking loader.
See the [frontend tree](../../front-end/README.md#organization) and
[style guide](../../front-end/src/styles/README.md).

Unexpected API errors are sanitized RFC 9457 `application/problem+json` responses.
In `dev`, Swagger UI at `/swagger-ui/index.html` and JSON at `/v3/api-docs` describe
current endpoints. Obtain a login token and paste it into Swagger's **Authorize**
field without the `Bearer ` prefix. Documentation is disabled by default and in
the normal `prod` configuration. Custom server ports/context paths also change
these URLs.

## Database initialization and storage

The [database model](../db/schema.dml) and [database rules](../db/rules.md) define the
agreed structure. [Canonical SQL](../../infra/database/tables/) is shared by manual
setup, the opt-in development reset, and demo initialization; Maven packages it
under `db/tables/`. Spring SQL auto-initialization is `never`.

| Mode | Initialization owner | Storage and lifetime |
| --- | --- | --- |
| Local development | Explicit [setup helper](../../infra/database/setup.py); see the [database guide](../../infra/database/README.md) for tables and migrations | [compose.yaml](../../compose.yaml) uses named `oracle-data`; `down` retains data |
| Opt-in local reset | `DevelopmentDatabaseReset` in `dev`, only when `DEV_DB_RESET=true` | Rebuilds USERS, PRODUCT_STATUSES and PRODUCTS and seeds local read fixtures/statuses |
| Disposable demo | [init.sh](../../infra/demo/init.sh) alone provisions and runs [schema.sql](../../infra/demo/schema.sql) | [compose.demo.yaml](../../compose.demo.yaml) uses 8 GiB tmpfs at `/opt/oracle/oradata`; stopping Oracle loses data |
| Production | External provisioning/migrations | Requires independently supplied connection settings; startup does not initialize schema |

The local helper provisions STORE_JDBC in FREEPDB1 only when absent, preserving an
existing password. Table setup validates existing objects rather than automatically
altering them. Oracle DDL commits implicitly; verification probes roll back their
rows but can leave identity gaps. Follow the canonical database guide for existing
status migrations, with writes stopped.

Keep `DEV_DB_RESET=false` for ordinary development. The explicit true setting
rebuilds only the allowlisted project tables in dependency order and deletes their
data on every startup. Reset guards require Oracle, a standard loopback JDBC URL,
STORE_JDBC as login/current schema, and FREEPDB1; external foreign keys fail rather
than cascade. The seeded user fixtures have no usable sample login passwords;
register a new account. Production excludes this reset regardless of the flag.

## Profiles and IDE operation

Select exactly one of `dev` or `prod`; neither is enabled by default and they cannot
be combined. See the canonical [configuration files](../../src/main/resources/).
`dev` uses fixed user `store_jdbc`, required `DB_PASSWORD`, and the default
FREEPDB1 URL; `DB_URL` overrides the full URL, otherwise `DB_PORT` changes its port.
`DB_USERNAME`/`DB_SERVICE` configure the setup helper rather than those runtime defaults.

For production supply `PROD_DB_URL`, `PROD_DB_USERNAME`, `PROD_DB_PASSWORD`,
`PROD_JWT_SECRET` and `PROD_JWT_ISSUER` securely. The signing key must encode at
least 32 random bytes in Base64 and be separate from development keys.
`PROD_JWT_TTL_SECONDS` defaults to 900. There is no local database credential fallback.
After provisioning independently, launch with:

```sh
mvn spring-boot:run -Dspring-boot.run.profiles=prod
# After mvn package:
java -jar target/java-jdbc-lab-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
```

Import `pom.xml` in IntelliJ and select **Run Dev** or **Run Prod** from the shared
[run configurations](../../.run/). Use an installed JDK 17+ and the project root as
working directory. Both configurations inherit the IDE environment and explicitly
disable dev reset. **Run Dev** imports `.env` via Spring's Java properties loader;
keep entries unquoted without shell `export` statements. **Run Prod** does not
import `.env`; provide production settings through the inherited environment.
These configurations do not provision the database.

For ORA-01017, check the account and destination before changing configuration:
`ORACLE_PASSWORD` is SYS/SYSTEM's password, `ORACLE_BOOTSTRAP_PASSWORD` is for the
bootstrap account, and `DB_PASSWORD` belongs to STORE_JDBC. Existing volume passwords
are not changed by editing `.env` or rerunning setup. Obtain the correct existing
password rather than resetting accounts or volumes.

Restart the application after configuration changes. Check IDE environment/VM
options, inherited environment, `SPRING_DATASOURCE_*`, `SPRING_APPLICATION_JSON`,
`-Dspring.datasource.*`, `--spring.datasource.*`, `JAVA_TOOL_OPTIONS`,
`JDK_JAVA_OPTIONS`, and custom config locations for overrides. Sourcing `.env` in
the IDE terminal does not update IntelliJ's inherited environment; restart the IDE
from a clean environment if needed. Do not print credentials while diagnosing.

`bash scripts/verify-oracle.sh` tests a fresh application-account SQL*Plus connection
inside the container at port 1521/FREEPDB1. It does not prove connectivity to an
overridden host JDBC URL. DBeaver should use service-name mode, localhost, `DB_PORT`
(default 1521), FREEPDB1 and `store_jdbc`, with the local application password and
no SYSDBA mode. Use the actual backend to verify its resolved destination separately.

## Disposable demo operation

Use the [root demo setup](../../README.md#disposable-docker-demo) for prerequisites,
secret configuration, startup and shutdown. Its declared requirement is at least
12 GB of Docker Desktop memory; the 8 GiB tmpfs ceiling is additional to process
memory needs and grows with data. This task verified configuration statically and
did not start containers, test memory sufficiency, or validate live readiness.

[demo-up.sh](../../scripts/demo-up.sh) validates `.env.demo` without printing values,
uses only the explicit `jl-store-demo` project and `compose.demo.yaml`, and discards
previous demo service containers before rebuilding. It does not source `.env.demo`,
read local `.env`, merge local Compose configuration, or remove local volumes.
Every invocation destroys previous demo data; the initialized USERS/PRODUCTS are
empty and only ACTIVE, INACTIVE and DELETED reference statuses are seeded.
Use this script for a fresh demo rather than `docker compose restart`.

The Oracle [image recipe](../../infra/demo/oracle.Dockerfile) copies initialization
files into the image, without host bind mounts. Its first-start hook calls the
existing schema provisioning SQL, then runs canonical table/status SQL as STORE_JDBC.
It asserts empty application tables and exact statuses before writing a marker
inside tmpfs. SQL errors abort initialization. Canonical SQL stays outside the
image's recursively executed initialization-hook directory.

Startup dependencies and readiness are sequential:

1. Oracle health requires the marker, image healthcheck, and read-only table/status
   checks in [ready.sh](../../infra/demo/ready.sh). Subsequent user activity may
   populate tables; readiness does not require them to remain empty.
2. Backend waits for healthy Oracle, uses `prod` with demo-only `PROD_*` values,
   and checks `GET /catalog/products?pageSize=1`, exercising HTTP and a database query.
3. Frontend waits for healthy backend and checks both static serving and proxied catalog.

The [backend image](../../Dockerfile) packages with Java 17/Maven and skips test
compilation/execution. The [frontend image](../../front-end/Dockerfile) builds with
Node 24 and `npm ci`. No automated tests or local setup verification probes run
as part of demo initialization.

[Nginx](../../front-end/nginx.demo.conf) serves production Angular assets, forwards
`/api/` to `backend:8080/` while stripping `/api`, and falls back to `index.html`
for deep links such as `/auth/login`. Only frontend port 8081 is published, bound
to loopback; Oracle and backend have no published host ports. This differs from
Angular's development proxy to host port 8080.

### Diagnostics

The script allows 30 minutes for builds and 20 minutes for service readiness;
initial Oracle extraction can take minutes. Failures return nonzero and print
scoped diagnostics, retaining containers for inspection. Check Docker daemon,
memory allocation, port 8081 availability, internet access and image architecture.
Run these from the repository root:

```sh
docker compose -p jl-store-demo --env-file .env.demo -f compose.demo.yaml ps
docker compose -p jl-store-demo --env-file .env.demo -f compose.demo.yaml logs --tail=100 oracle backend frontend
docker compose -p jl-store-demo --env-file .env.demo -f compose.demo.yaml exec -T oracle bash /opt/demo/ready.sh
curl --fail http://127.0.0.1:8081/api/catalog/products
curl --fail http://127.0.0.1:8081/auth/login
```

A successful SPA response alone does not establish API readiness; check the proxied
catalog too. Shut down using the scoped command in the root README, including after
failed startup. Keep the `jl-store-demo` project name. Runtime secrets are excluded
from build contexts/frontend assets, but Docker administrators can inspect container
environments; avoid sharing configuration dumps or credential-bearing diagnostics.
