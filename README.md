# Java JDBC Lab

[![Backend and frontend CI](https://github.com/hhCarlos/java-jdbc-lab/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/hhCarlos/java-jdbc-lab/actions/workflows/backend-tests.yml)

A full-stack Java/JDBC and Angular laboratory developed with AI-assisted workflows.
It explores Oracle persistence, layered backend features, and an authenticated product-management UI.

## Features

- Registration and BCrypt login with Bearer JWT authentication.
- Protected user reads and current-user profile.
- Owner product listing, creation, editing, publication controls, and soft deletion.
- Public catalog API showing only ACTIVE products with positive stock.
- Angular login, registration, product forms, notifications, and shared UI components.
  The profile route exists but its view is currently empty.
- Development OpenAPI/Swagger UI and an isolated, disposable Docker demo.

## Stack and requirements

Versions below are declared by the repository; this documentation update did not run the application.

| Component | Declared version / configuration |
| --- | --- |
| Backend | Java 17 target, Spring Boot 4.1.0, Maven; local prerequisite JDK 17+ and Maven 3.6.3+ |
| Persistence | Spring JDBC / JdbcTemplate, Oracle `ojdbc11` managed by Spring Boot |
| Database | `gvenzl/oracle-free:23.26.3-slim`, `linux/arm64` |
| API documentation | springdoc OpenAPI 3.1.1, enabled in `dev` |
| Frontend | Angular `^21.2.0`, CLI/build `^21.2.27`, TypeScript `~5.9.2`, SCSS |
| Frontend tools | Node.js 24 (`front-end/.nvmrc`), npm 11.16.0 (`packageManager`) |
| Tests | JUnit/AssertJ, H2 and mocks; Angular unit-test builder with Vitest/jsdom |

Local development also needs Python 3, Bash, and a running Docker daemon with
Compose supporting `up --wait`. The checked-in Oracle configuration targets Apple
Silicon/ARM64. The demo declares Compose v2.20+ (or v5); see its memory requirement below.
There is no Maven Wrapper. See [frontend instructions](front-end/README.md) for tool setup.

## Local development

Run commands from the repository root unless stated otherwise.

### Configure the environment

```sh
cp .env.example .env
chmod 600 .env
# Generate separate database passwords; prefix each generated value with a letter:
openssl rand -hex 24
openssl rand -hex 24
openssl rand -hex 24
# Generate the separate JWT signing key:
openssl rand -base64 32
```

Replace all placeholders in `.env`: use separate values for `ORACLE_PASSWORD`
(SYS/SYSTEM), `ORACLE_BOOTSTRAP_PASSWORD` (bootstrap account), and `DB_PASSWORD`
(application account). The setup helper requires `DB_PASSWORD` to be 12–128
alphanumeric characters starting with a letter. Keep `DB_USERNAME=store_jdbc` and
`DB_SERVICE=FREEPDB1`. Set `JWT_SECRET` to Base64 encoding of at least 32 random
bytes; `JWT_ISSUER` defaults to `java-jdbc-lab`, and token lifetime defaults to 900 seconds.
Keep `DEV_DB_RESET=false`. Use plain, unquoted `KEY=value` entries compatible with
both the shell and the IntelliJ properties import. Keep this ignored file private.

Compose loads `.env`; command-line Spring Boot needs exported variables:

```sh
set -a
. ./.env
set +a
```

### Initialize the local database

```sh
docker compose up -d --wait --wait-timeout 600 oracle
python3 infra/database/setup.py
python3 infra/database/setup.py --users-table
python3 infra/database/setup.py --products-table
bash scripts/verify-oracle.sh
```

Schema provisioning and table initialization are separate steps. The table helpers
create absent objects and validate existing ones; their verification inserts are
rolled back, but identity gaps can remain. For an existing database predating product
statuses, stop application writes and follow the [status migration instructions](infra/database/README.md#publication-statuses-and-existing-database-migration).
Normal application startup neither creates nor migrates tables.

Local Oracle storage persists in the `oracle-data` volume. Changing `.env` does not
rotate existing database passwords. Do not remove the volume to apply credentials.
See [database setup details](infra/database/README.md) and [initialization ownership](docs/architecture/README.md#database-initialization-and-storage).

### Start the backend and frontend

In the configured terminal:

```sh
DEV_DB_RESET=false mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

The backend defaults to <http://localhost:8080>, using
`jdbc:oracle:thin:@//localhost:1521/FREEPDB1` as `store_jdbc`.
`DB_PORT` changes the default port; `DB_URL` overrides the complete JDBC URL.
Open [Swagger UI](http://localhost:8080/swagger-ui/index.html) or
[OpenAPI JSON](http://localhost:8080/v3/api-docs) in `dev`.
Register a user, then log in; registration does not issue a token.

In another terminal:

```sh
cd front-end
nvm use
npm ci
npm start
```

`nvm use` is optional if Node 24 is already selected. Open <http://localhost:4200>.
The development server forwards `/api/**` to the backend, removing `/api`.
See the [frontend README](front-end/README.md) for tests and build commands.
Shared IntelliJ **Run Dev** / **Run Prod** configurations and troubleshooting are
covered in the [architecture documentation](docs/architecture/README.md#profiles-and-ide-operation).

Stop each development server with Ctrl+C. Stop the local database with
`docker compose down`; its data remains in the named volume.

## Disposable Docker demo

Requirements: Apple Silicon Mac, running Docker Desktop, Compose v2.20+ (or v5),
Python 3, Bash, internet access, and free host port 8081. **Allocate Docker Desktop
at least 12 GB of memory**: Oracle uses an 8 GiB tmpfs ceiling plus database and
application memory. Java, Maven, Node, and Nginx run inside builds/containers.

```sh
cp .env.demo.example .env.demo
chmod 600 .env.demo
# Generate two separate passwords; prefix each generated value with a letter:
openssl rand -hex 24
openssl rand -hex 24
# Generate a separate JWT key:
openssl rand -base64 32
```

Replace every placeholder in `.env.demo` with separate demo-only values. Use only
its three template keys and plain, unquoted `KEY=value` entries. Both passwords must
be 12–128 alphanumeric characters starting with a letter; `DEMO_JWT_SECRET` must
encode at least 32 random bytes in Base64. Do not reuse local or production credentials.

```sh
./scripts/demo-up.sh
```

**Every invocation of `demo-up.sh` destroys previous demo data and starts with empty
USERS and PRODUCTS tables plus the ACTIVE, INACTIVE, and DELETED reference statuses.**
Open <http://127.0.0.1:8081> and register a new user. First builds and Oracle extraction
can take minutes. Local development storage is independent.

Shutdown also discards the demo database:

```sh
docker compose -p jl-store-demo --env-file .env.demo -f compose.demo.yaml down --timeout 30
```

See [demo startup and troubleshooting](docs/architecture/README.md#disposable-demo-operation)
for readiness checks, scoped diagnostics, and proxy details.

## Verification and contributor instructions

```sh
mvn test
mvn clean verify
```

[CI](.github/workflows/backend-tests.yml) runs backend tests, frontend tests, and a
frontend production build. H2 and mock tests do not establish live Oracle behavior.
No coverage badge is available: coverage report generation and a reporting/badge
integration are not configured. Test-result artifacts are not coverage reports.

- [Architecture and operations](docs/architecture/README.md)
- [Frontend development](front-end/README.md)
- [Database model](docs/db/schema.dml) and [database rules](docs/db/rules.md)
- [Agent instructions](AGENTS.md), [Git preflight](docs/preflight/git.md),
  [prompt recording](docs/workflow/prompt-record.md), and [author identity](docs/workflow/author.md)
