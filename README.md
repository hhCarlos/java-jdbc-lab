# Java JDBC Lab

Minimal Java 17 / Spring Boot 4.1.0 / Maven foundation for Oracle JDBC development.
Includes two user read endpoints backed by JdbcTemplate and the existing Oracle USERS
table. Authentication is available at `POST /auth/login` and `POST /auth/register`; user reads require Bearer JWT authentication. Schema changes at startup are disabled unless
the explicit local development reset is enabled.

## Structure and dependency rules

This remains one Maven application, organized by feature rather than global layers:

```text
src/main/java/com/example/jdbclab/
  users/
    domain/                  User (public, credential-free model)
    application/             UserService, UserRepository, RegistrationRepository,
                             UserNotFoundException, EmailAlreadyExistsException
    infrastructure/
      persistence/           JdbcUserRepository (reads + registration writes)
      web/                   UserController, UserResponse
      configuration/         UserConfiguration, DevDatabaseConfiguration
      database/              DevelopmentDatabaseReset
  auth/
    domain/                  EmailAddress normalization rule
    application/             LoginService, RegistrationService; credential/password/token
                             ports and their AccessToken/UserCredentials projections
    infrastructure/
      persistence/           JdbcCredentialRepository (credential projection only)
      password/              BcryptPasswordVerifier
      jwt/                   JwtTokenIssuer
      security/              BearerAuthenticationEntryPoint
      web/                   AuthController, RegistrationController, HTTP DTOs/validation
      configuration/         AuthConfiguration, SecurityConfiguration, OpenApiConfiguration
  infrastructure/
    JdbcLabApplication       Stable composition root / IntelliJ entry point
    configuration/           RuntimeProfileConfiguration
    web/                     Global ApiExceptionHandler, ApiErrorController
src/main/resources/application{,-dev,-prod}.yaml
src/test/                    Tests mirror feature/responsibility packages
compose.yaml                 Local Oracle Database Free
```

Within each feature, dependencies point inward:
`infrastructure -> application -> domain`. Domain and application code depend on
Java types and permitted inner-layer contracts, never Spring, HTTP, JDBC, BCrypt,
or JWT libraries. Framework wiring stays in infrastructure configuration classes.
There are no empty feature layers or shared-domain packages.

The only production cross-feature direction is **auth -> users.application/domain**.
`RegistrationService` uses the users-owned `RegistrationRepository` creation contract
and public `User` model. `JdbcUserRepository` implements both user persistence ports,
retaining one INSERT, generated-ID handling, public row mapper, and transaction
boundary. Users does not import auth. Auth's existing credential adapter keeps its
separate `id, password_hash` query through the same configured `JdbcTemplate`; it
does not import users infrastructure or expose credentials through public reads.

The root `infrastructure` package is application-wide composition/HTTP plumbing,
not another feature. Its global error advice explicitly maps both features'
application exceptions. Features never import the composition root. The existing
`com.example.jdbclab.infrastructure.JdbcLabApplication` entry point is unchanged;
its explicit scan covers `com.example.jdbclab` so both features are discovered.
The shared IntelliJ run configurations need no changes.

Two small HTTP views are intentional: users owns `UserResponse`, while auth owns
`RegistrationResponse`. Both map the public `User` model into the same six JSON
fields; registration retains the existing OpenAPI `UserResponse` schema name.
This avoids an import of another feature's infrastructure or moving a transport
DTO into a domain/application layer. A strict JSON comparison in the registration test checks that both representations
stay aligned. Their matching shape is a maintenance tradeoff;
there is no duplicated persistence implementation. The features still share the
physical USERS table and a single Spring application/context. These are package
boundaries, not independently deployable modules.

`ArchitectureTest` checks source/package alignment, framework-free inner layers,
the one-way feature dependency, and absence of feature imports of another feature's
infrastructure or the composition root. It uses existing JUnit/AssertJ dependencies;
no Spring Modulith or architecture library is added. Full-context and HTTP tests
continue to cover scanning, wiring, serialization, and security behavior.

Spring Boot supplies the Oracle DataSource, Hikari pool, shared JdbcTemplate, and
JDBC transaction manager. Registration's transactional adapter stays in users
infrastructure; use cases remain framework-free. Profiles, SQL resources, database
objects, credentials/signing keys, and endpoint paths are unchanged by this refactor.

## Local development

Prerequisites: JDK 17+, Maven 3.6.3+, and Docker with Compose and its daemon running.
Configure the JWT signing key described in [Login](#login) before starting the application.

```sh
# .env has been generated locally. For a fresh checkout:
# cp .env.example .env
# Replace password placeholders with generated passwords before starting.
set -a
. ./.env
set +a
docker compose up -d --wait --wait-timeout 600 oracle
python3 infra/database/setup.py
bash scripts/verify-oracle.sh
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Compose reads `.env` automatically; Maven/Spring Boot uses the exported environment.
Spring Boot does not automatically read `.env`; `set -a` and sourcing the file above
exports its values to the Maven process and its application. For an IDE run configuration,
select **Run Dev** (which imports root `.env`) or provide DB_PASSWORD and optionally DB_PORT / DB_URL.
`application-dev.yaml` uses the fixed `store_jdbc` user and FREEPDB1 service;
DB_URL can override the complete URL for normal reads. The default is
`jdbc:oracle:thin:@//localhost:1521/FREEPDB1`, user `store_jdbc`.
DB_PASSWORD is required; there is no hardcoded password fallback.

### IntelliJ IDEA

Import the root `pom.xml` as a Maven project. The shared Java Application
configurations in `.run/` appear as **Run Dev** and **Run Prod** in the run selector
and under **Run > Edit Configurations**. Select **Run Dev**, then Run or Debug for
local development. Select **Run Prod** only when you intend to connect to production.
Both use `com.example.jdbclab.infrastructure.JdbcLabApplication`, module
`java-jdbc-lab`, the project root as their working directory, and the module JDK.
Maven targets Java 17; the existing local IDEA project SDK is JDK 23. Configure an
installed JDK 17+ under **File > Project Structure** if the SDK is unresolved.

Both configurations inherit IntelliJ's environment and explicitly set
`DEV_DB_RESET=false`. **Run Dev** additionally passes
`--spring.config.import=optional:file:./.env[.properties]`, so Spring reads the
ignored root `.env` directly using its Java properties loader. The existing local
file uses compatible unquoted `KEY=value` entries; shell `export` statements and
shell-style quoted values should not be added to it. No secrets are copied into
shared XML. Environment variables, JVM system properties, and command-line
arguments can still override file settings. CLI Maven launches still need the
export commands above unless you explicitly pass this config import there too.
Ensure the local database is running and its schema/table are provisioned as above;
these run configurations do not provision or reset it.

For **Run Prod**, provide `PROD_DB_URL`, `PROD_DB_USERNAME`, and `PROD_DB_PASSWORD`
securely in the environment inherited by IntelliJ before launching it. The local
development `.env` does not supply production credentials. The existing production
profile requires all three values, has no development credential fallback, and
disables resets independently of the environment flag. Do not save passwords in
the shared run configurations. Only **Run Dev** imports `.env`; **Run Prod** does not. Neither requires a
Spring-specific IntelliJ run configuration or plugin.

### Diagnosing Oracle authentication in Run Dev

With the checked-in dev settings and local `.env`, the datasource is
`jdbc:oracle:thin:@//localhost:1521/FREEPDB1`, username `store_jdbc`.
`DB_URL` overrides the full URL; otherwise `DB_PORT` overrides the port.
`DB_USERNAME` and `DB_SERVICE` in `.env` configure the setup helper; the runtime
uses the fixed `store_jdbc` user and FREEPDB1 service unless the full datasource
settings are overridden. `ORACLE_PASSWORD` is for SYS/SYSTEM initialization;
`ORACLE_BOOTSTRAP_PASSWORD` belongs to the separate bootstrap user. Neither is the
application's `DB_PASSWORD`.

After updating the shared Run Dev configuration, stop the existing application,
reload the project/configuration from disk, and inspect **Run > Edit Configurations
> Run Dev**. Confirm the dev profile and config-import arguments above and the
project-root working directory. A running application never reloads credentials
from a changed `.env` or run configuration.

Check the configuration's **Environment variables** and **VM options**, along with
the environment inherited by IntelliJ, for stale `DB_PASSWORD`, `DB_URL`, `DB_PORT`,
`SPRING_DATASOURCE_PASSWORD`, `SPRING_DATASOURCE_USERNAME`, and
`SPRING_DATASOURCE_URL`. Also check `SPRING_APPLICATION_JSON`, `-Dspring.datasource.*`,
`--spring.datasource.*`, `JAVA_TOOL_OPTIONS`, `JDK_JAVA_OPTIONS`, and custom Spring
config locations. These can override the intended file/profile values. Remove
unintended overrides locally; do not copy passwords into the shared configuration.
If IntelliJ inherited stale values, fully quit it and restart from a clean
environment. Sourcing `.env` in the IDE terminal does not update the IDE's environment.

A fresh **Run Dev** process uses a new connection pool. Retry
`http://localhost:8080/users` and inspect the backend result. As an independent
read-only check, `bash scripts/verify-oracle.sh` opens a fresh SQL*Plus connection
using `.env` plus exported overrides, inside the Oracle container. That helper
always targets container-local port 1521 / FREEPDB1, so it does **not** prove an
application's overridden JDBC URL or host port is correct. Successful authentication
must also be checked through the actual application. An existing STORE_JDBC user's
password is preserved by setup: editing `.env` cannot rotate it. If a fresh login
still reports ORA-01017, obtain the existing account's correct password and update
only the ignored local configuration; do not reset users, passwords, or volumes.

During this diagnosis, Spring Boot's actual config-data resolver confirmed that
the updated Run Dev arguments resolve the expected local URL, `store_jdbc`, a
nonblank password from root `.env`, and reset disabled. A fresh Oracle JDBC login
with those resolved values was attempted but failed with a socket/network error
(17820 / SQLState 08006), before authentication could be confirmed. Docker socket
access and process environment inspection were denied, and HTTP requests to
localhost:8080 could not connect from the tool environment. Thus the running
IntelliJ application's credentials and the cause of its reported ORA-01017 remain
unverified. No database state was changed.

## Runtime profiles and startup reset

Choose `dev` or `prod` explicitly; neither is enabled by default. Shared pool settings,
Oracle driver, API error behavior and `spring.sql.init.mode=never` stay in
`application.yaml`. Only connection settings and the development reset switch vary.
The two profiles cannot be active together, in either order; startup fails before
opening a datasource connection. There is no additional runtime or test profile.

For ordinary local development, export `.env` as above and leave the reset disabled:

```sh
DEV_DB_RESET=false mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Omitting DEV_DB_RESET also defaults to false. This mode leaves existing tables and
rows intact and does not create missing tables. Use the manual table setup below
if needed. To deliberately rebuild and seed this project's known local tables:

```sh
DEV_DB_RESET=true mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

This deletes existing PRODUCTS and USERS data on every startup while the flag is true. Return
the flag to false for subsequent starts. The reset never drops users, schemas,
volumes, or unrelated tables; the table allowlist contains PRODUCTS and USERS. PRODUCTS is dropped first;
USERS is created before PRODUCTS and its nonunique owner index.
It refuses non-Oracle connections, non-loopback JDBC URLs, another login/current
schema, or a PDB other than FREEPDB1. Accepted reset URLs use the form
`jdbc:oracle:thin:@//localhost:1521/FREEPDB1` (also 127.0.0.1 or [::1], with a numeric
port). Nonstandard Oracle URLs are intentionally refused for resets. External
foreign keys cause the drop to fail rather than cascading to other objects.

Canonical DDL lives in `infra/database/tables/users.sql` and
`infra/database/tables/products.sql`. Maven packages both under `db/tables/`;
startup reset and the SQL*Plus setup helper read these same files.
To add PRODUCTS while preserving existing data, run
`python3 infra/database/setup.py --products-table` after USERS exists. No duplicate table definition is maintained. Oracle DDL commits implicitly,
so rebuilding cannot be rolled back; seed insertions run in one transaction and
are rolled back if seeding fails, while startup fails visibly.

After reset, generated IDs 1 and 2 belong to Ana Lopez (`ana@example.test`) and
Luis Garcia (`luis@example.test`), with both timestamps fixed at
`2026-01-01T00:00:00Z`. Password fields contain fixed PBKDF2-SHA256 hashes with
600,000 iterations and salts, produced from discarded random inputs. No plaintext
sample passwords are stored or provided; these fixtures are for read development,
not sample login credentials. The login feature does not convert these fixtures.

Production requires all three nonblank settings from your deployment environment
or secret manager, independently of the local `.env` settings:

```sh
# Set PROD_DB_URL, PROD_DB_USERNAME and PROD_DB_PASSWORD securely before running.
mvn spring-boot:run -Dspring-boot.run.profiles=prod
# Or, after packaging:
java -jar target/java-jdbc-lab-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
```

PROD_DB_URL is a complete production Oracle JDBC URL. There is no fallback to
DB_URL, DB_USERNAME, DB_PASSWORD, localhost, or STORE_JDBC. Missing/blank production
settings fail startup. Provision the production schema separately; this project
does not provision a production database. SQL auto-initialization is disabled.
The development reset bean is excluded whenever prod is active, even if
DEV_DB_RESET=true or the reset application property is overridden. Its execution
also checks the active profiles defensively before obtaining a connection.

Tests use explicit H2 settings, in-memory databases, or mocked JDBC connections;
they do not connect to or reset the live development database. Profile tests load
the actual YAML and verify defaults, production-only settings, mutual exclusion,
and reset-bean selection. Reset tests verify destination guards, the fixed table
allowlist, shared DDL use, deterministic seed fields/hashes, and transaction handling.

`.env` is ignored by Git and was created with owner-only permissions (0600). It contains
separate random 32-character administrator and application passwords, each beginning
with a letter and containing uppercase, lowercase and digits. `.env.example` contains
password placeholders only. These are local development credentials.

Compose maps ORACLE_PASSWORD to the image's SYS/SYSTEM administrator password.
ORACLE_BOOTSTRAP_USER and ORACLE_BOOTSTRAP_PASSWORD map separately to the image's
APP_USER and APP_USER_PASSWORD, retaining the original `jdbc_app` bootstrap identity.
Those image variables only apply on first initialization. The schema helper's DB_USERNAME
and DB_PASSWORD are independent; changing them does not create a database user automatically.
Keep DB_USERNAME=store_jdbc and DB_SERVICE=FREEPDB1 for the helper. The dev runtime fixes
its user/service to STORE_JDBC/FREEPDB1 and reads DB_PASSWORD for that account.
The HTTP server starts on port 8080. Ensure STORE_JDBC.USERS exists before querying it.

The pinned `gvenzl/oracle-free:23.26.3-slim` image runs with `platform: linux/arm64`
on Apple Silicon, without x86 emulation. See the [image maintainer's ARM and setup
documentation](https://github.com/gvenzl/oci-oracle-free). Compose includes a database
health check, a persistent named volume, an application schema user, and a database
port bound only to localhost. First initialization may take several minutes.

```sh
docker compose ps
docker compose logs -f oracle
docker compose down
```

`down` retains data. The existing `oracle-data` volume mapping is preserved; do not
remove the volume to apply credentials. Credentials are applied on first database
initialization only; changing `.env` does not change credentials in an existing volume.
For an initialized database, run the explicit schema setup below; do not recreate the volume.

For DBeaver select Oracle, host `localhost`, port `1521` (or DB_PORT), connection type
**Service name**, service `FREEPDB1`, username `store_jdbc`, and the DB_PASSWORD value
from your local `.env`. Use a regular connection, not SYSDBA. The verification script
uses SQL*Plus inside the container, authenticates using the application DB_USERNAME
and DB_PASSWORD over TCP, and runs
`SELECT USER FROM DUAL` and `SELECT 1 FROM DUAL` without printing passwords.

## Repeatable application schema setup

Prerequisites: Python 3, a running healthy Compose `oracle` service, and FREEPDB1.
The setup uses the container's local OS-authenticated SYSDBA connection for provisioning;
it does not require an administrator password in SQL or command arguments.

```sh
python3 infra/database/setup.py
python3 infra/database/setup.py
bash scripts/verify-oracle.sh
```

`infra/database/setup.sql` checks DBA_USERS in FREEPDB1. It creates STORE_JDBC only
when absent, using DB_PASSWORD supplied as a SQL bind through standard input. If the
user exists, the script leaves its password and data untouched. Both paths grant
CREATE SESSION, CREATE TABLE and CREATE SEQUENCE and configure a 100 MiB quota on USERS.
It does not grant DBA, create business tables, delete users, or change volumes. Oracle
DDL commits implicitly: if a step fails, correct the issue and rerun; this is not an
all-or-nothing transaction. Existing privileges are not revoked.

`setup.py` loads the root `.env`, with exported environment variables taking precedence.
Keep DB_USERNAME=store_jdbc and DB_SERVICE=FREEPDB1. DB_PASSWORD must match the existing
STORE_JDBC password if that user already exists; failed authentication never triggers
password rotation. The initial configuration retains the locally generated password as
the candidate for a new user. If an existing STORE_JDBC uses a different password, put
that known password into `.env` rather than resetting the account. This helper accepts
12–128 alphanumeric password characters starting with a letter (the generated local
passwords meet that restriction); other password formats require adapting input handling.
Credentials never appear in version-controlled SQL or command arguments. The helper
redacts password values from SQL*Plus output, including errors.

Each setup invocation reports creation or the existing-user branch, grants and quota,
then connects over TCP as STORE_JDBC and executes SELECT 1 FROM DUAL. The standalone
verification command uses current host application credentials, not potentially stale
APP_USER values stored in a container's environment. For Spring Boot, export `.env`
as shown above again after changes; the running process does not reload credentials.

Setup attempts in this session were blocked by permission denied on Docker's socket.
Both invocations failed before SQL execution; existing database users could not be
inspected and live connection/idempotency behavior remains unverified. The two commands
above must succeed against the database to establish that verification.

## First application table

See [infra/database/README.md](infra/database/README.md) for the rerunnable USERS table
creation, strict structure validation and rollback-only insert checks:

```sh
python3 infra/database/setup.py --users-table
```

This command uses the existing STORE_JDBC schema and does not create or alter users.

## User reads

- `GET /users` returns 200 and an array ordered by ID, including `[]` when empty.
- `GET /users/{id}` returns 200 for a found user, or a 404 problem response when missing.
- A nonnumeric or out-of-range Long ID receives a 400 problem response.

Both successful responses expose only `id`, `name`, `lastname`, `email`, `createdAt`,
and `updatedAt`. Timestamps use OffsetDateTime and serialize with their offset.
Neither SQL query selects password_hash; the domain read model and response DTO also
omit credentials. ID lookup uses a JDBC bind parameter. The application UserService
uses the UserRepository port through constructor injection, with Spring bean wiring
in infrastructure. No pagination or write operations are included.

```sh
curl -H "Authorization: Bearer $ACCESS_TOKEN" http://localhost:8080/users
curl -H "Authorization: Bearer $ACCESS_TOKEN" http://localhost:8080/users/1
```

Read-flow checks run with the project's exact dependencies:

```sh
mvn -o -Dmaven.repo.local=/tmp/jdbc-lab-m2 -B test
```

The temporary cache is an environment workaround for restricted writes to the normal
Maven cache; normally use `mvn test` or `mvn clean verify`. Tests cover service behavior,
real JDBC mapping and ID binding on H2, SQL credential exclusion, and MockMvc requests
through controller, service, repository and centralized advice. H2 checks do not replace
live Oracle integration testing. After adding runtime profiles, all 32 tests passed with
`mvn -o -Dmaven.repo.local=/tmp/jdbc-lab-m2 -B clean test`. Earlier, `verify`
reached packaging but was blocked by uncached JAR-plugin dependencies and unavailable
Maven Central access.

## Login

`POST /auth/login` issues tokens; `POST /auth/register` creates accounts. Both auth
endpoints remain public. Both user GET endpoints require a valid Bearer JWT. There is no refresh, logout, or `/me` endpoint, and no session
or authentication cookie is created. Existing user reads and stored hashes are unchanged.

The framework-free `LoginService` depends on credential lookup, password verification,
and token-issuance ports in `application`. Infrastructure reuses the configured
`JdbcTemplate` for a separate parameterized credential query:
`SELECT id, password_hash FROM users WHERE LOWER(TRIM(email)) = ?`. Registration
and login share surrounding-whitespace removal and lowercase normalization with
`Locale.ROOT`. New accounts store the normalized email. Existing emails and hashes
are never rewritten; normalized lookups recognize legacy case variants. If multiple
legacy rows share a normalized email, login fails with the generic 401 rather than
selecting an arbitrary account, and registration rejects that address with 409.
Passwords are never trimmed or otherwise modified. Credentials never enter the public user DTO. Spring Security's direct
`BCryptPasswordEncoder` verifies existing raw `$2b$` hashes without a `{bcrypt}`
prefix. A dummy BCrypt check is performed for unknown accounts. There are no
password updates or hash migrations.

Provide a JWT signing key before starting the application. Generate a development
key in the ignored local `.env`, without printing it (run once; keep the key stable
across restarts):

```sh
python3 - <<'PYKEY'
from pathlib import Path
import base64, secrets
path = Path('.env')
text = path.read_text()
if any(line.strip().startswith('JWT_SECRET=') for line in text.splitlines()):
    raise SystemExit('JWT_SECRET already exists; manage it locally without printing it.')
with path.open('a') as output:
    output.write('\nJWT_SECRET=' + base64.b64encode(secrets.token_bytes(32)).decode() + '\n')
PYKEY
```

**Run Dev** imports `.env`. For Maven, export it as described in Local development.
`JWT_SECRET` must be Base64 encoding of at least 32 cryptographically random bytes;
there is no default signing key. Do not use a database password or commit keys.
`JWT_ISSUER` defaults to `java-jdbc-lab`; `JWT_TTL_SECONDS` defaults to 900 and must
be between 1 and 86400 seconds. Missing/invalid signing configuration prevents startup.
Changing the signing key invalidates previously issued tokens.

Production requires its own `PROD_JWT_SECRET` and nonblank `PROD_JWT_ISSUER`, supplied
through the deployment environment/secret manager, plus optional
`PROD_JWT_TTL_SECONDS` (default 900). The normal prod profile has no fallback to
`JWT_SECRET` or the local `.env` key. Keep production and development keys separate.
No signing key is stored in the shared IntelliJ configurations.

With dev running on the configured port 8080 and no context path, send:

```http
POST http://localhost:8080/auth/login
Content-Type: application/json

{
  "email": "ana@example.test",
  "password": "replace-with-that-existing-users-password"
}
```

Use a known existing account and its real password; this example does not create an
account. The earlier optional development-reset fixtures use PBKDF2 hashes of discarded
random inputs and are not usable BCrypt login credentials. No existing rows or hashes
are converted by this feature.

A successful response is JSON with `accessToken` (a signed JWT), `tokenType: "Bearer"`,
and `expiresIn` (seconds), with `Cache-Control: no-store`. Tokens use HS256 through
Spring Security's Nimbus JOSE integration, with only the user ID as string `sub`,
`iss`, `iat`, and `exp` claims. Passwords and hashes never appear in claims or responses.
Treat tokens as credentials and use HTTPS outside local development.

Email and password are required and nonblank. Email must be valid and at most 254
characters; passwords must fit BCrypt's 72 UTF-8 byte limit (no silent truncation).
Invalid input or malformed JSON returns 400. Unknown email and incorrect password
both return the same generic 401 `application/problem+json` response with detail
`Invalid email or password.` Database/signing failures remain sanitized 500 responses.
Validation does not return rejected values, and login errors do not log credential-bearing
exception details. Never enable request-body/credential logging for login.

In [Swagger UI](http://localhost:8080/swagger-ui/index.html), expand
**POST /auth/login**, choose **Try it out**, supply the JSON above with a known
account's credentials, then **Execute**. Copy `accessToken`, click **Authorize**,
and paste the token (without the `Bearer ` prefix) to use the protected user reads.

Authentication tests cover login through the actual Spring MVC/service/JDBC wiring
on isolated H2, raw `$2b$` verification, identical failed-login responses, invalid
requests, credential redaction, authenticated user reads, parameter binding,
production key separation, JWT signatures/claims, expiry, and tampering. Run:

```sh
mvn test
```

Before adding JWT route protection, `mvn -o -B test` passed all 71 tests with no
failures or skips, including BCrypt login, JWT signatures/claims, expiration,
tampering, production key separation, and OpenAPI/UI wiring. A separate local check
imported the ignored root `.env` using the exact Run Dev config-import argument,
performed `POST /auth/login` through Spring MVC against isolated H2, and validated
the returned token's HS256 signature and required claims using the saved local key.
The check confirmed the resolved key matches `.env` without printing it. No live
Oracle data was accessed or modified; login against the existing Oracle accounts
has not been verified by these checks.

## JWT-protected user reads

`GET /users` and `GET /users/{id}` (including their HTTP HEAD equivalents) require
`Authorization: Bearer <accessToken>`. Obtain a token with the public
`POST /auth/login`; registration also remains public. Any authenticated user may
list users or read any user ID. No roles, scopes, or ownership checks are required.
Query parameters and cookies do not authenticate a request.

Spring Security's standard OAuth2 resource-server support resolves the Bearer
header and authenticates it with `NimbusJwtDecoder`. Issuance and verification share
the same decoded signing-key bean and configured issuer. The decoder accepts only
HS256, requires `exp` and a nonblank `sub`, validates the expected `iss`, rejects
expired tokens without an expiration grace period, and validates `nbf` when present.
The existing `JWT_SECRET` / `JWT_ISSUER` development settings and separate
`PROD_JWT_SECRET` / `PROD_JWT_ISSUER` production settings are unchanged. There is no
remote issuer discovery, database lookup, or custom authentication filter.

Missing, malformed, expired, tampered, wrongly signed, or otherwise invalid tokens
return **401**, `WWW-Authenticate: Bearer`, and a generic `application/problem+json`
response with detail `A valid Bearer token is required.` Token parsing details and
the supplied token are never echoed. With valid authentication, successful DTOs are
unchanged, a missing user remains 404, and a malformed ID remains 400. Hashes remain
excluded from public reads. Authentication is stateless; form login, Basic login,
sessions, and logout are not enabled. CSRF checks are disabled for this API, which
uses explicit Authorization headers rather than authentication cookies.

For example, keep the access token from login in a local shell variable and call:

```sh
curl -H "Authorization: Bearer $ACCESS_TOKEN" http://localhost:8080/users
curl -H "Authorization: Bearer $ACCESS_TOKEN" http://localhost:8080/users/1
```

In dev, Swagger UI and `/v3/api-docs` remain accessible without a token. The
`bearerAuth` HTTP security scheme enables **Authorize** in Swagger UI; only user-read
operations require it. Login and registration have no OpenAPI security requirement.
No secrets are stored in the specification. Clear or replace an expired token through
**Authorize**, or log in again. The documentation remains disabled by the normal
production profile.

`UserAccessSecurityTest` uses real tokens and the actual filter chain against H2 to
cover absent/malformed headers, bad signatures, expired tokens, wrong issuers and
algorithms, missing claims, future `nbf`, cross-user reads, authenticated 404/400,
context paths, and public login/registration. Full-context auth and OpenAPI tests
also install the real filter chain so they cannot silently bypass protection.

Verification: the resource-server dependencies are now cached. All real filter-chain,
JWT decoder, public-auth, and OpenAPI checks pass in the 84-test refactored suite.
No live database data, signing keys, or production application were changed or
started during these checks. See Verification below for the remaining packaging
plugin dependency limitation.

## Registration

`POST /auth/register` creates a user in the existing USERS table and returns the
same public user JSON format as the read endpoints (`RegistrationResponse` in auth,
`UserResponse` in users). It does not log the user in,
issue a JWT, or change existing users, hashes, tables, or database volumes.

With **Run Dev** running, send:

```http
POST http://localhost:8080/auth/register
Content-Type: application/json

{
  "name": "Ana",
  "lastname": "Lopez",
  "email": "ana@example.test",
  "password": "choose-your-own-password"
}
```

`name` and `lastname` are required, nonblank, and at most 50 characters each.
`email` is required, must be valid, and must be at most 254 characters after the
shared normalization described above. `password` is required and nonblank, with
the same BCrypt limit as login: at most 72 UTF-8 bytes, including any whitespace.
The password is hashed with the existing `PasswordEncoder` exactly as supplied;
there is no trimming, silent truncation, plaintext storage, or hash prefix change.

Success returns **201 Created**, a `Location` header pointing to `/users/{id}`
(including a configured context path), and only `id`, `name`, `lastname`, `email`,
`createdAt`, and `updatedAt`. The database generates the ID and timestamps. The
adapter uses a parameterized INSERT requesting the `ID` generated-key column
explicitly for Oracle, then reads the existing public projection in the same
transaction. No token fields, plaintext passwords, or hashes appear in the response.

Invalid input or malformed JSON returns **400** with `Invalid request input.`
An existing normalized email returns **409** with `Email is already registered.`
Both errors use `application/problem+json`. An existence check catches existing
accounts (including legacy case variants); the database's existing `users_email_uk`
constraint also catches concurrent inserts of the same normalized email. A database
duplicate-email conflict is translated to the same 409 without exposing SQL or hashes.
Other failures return a sanitized 500, and auth failures do not log credential-bearing
exception messages. No new database constraint or migration is introduced. Writers
outside this registration endpoint must also normalize email if they want the same
case-insensitive uniqueness convention.

In [Swagger UI](http://localhost:8080/swagger-ui/index.html), expand
**POST /auth/register**, choose **Try it out**, fill in the request, then **Execute**.
Use a new email to test success and repeat it to test 409. Registration intentionally
persists the new account. To log in afterward, call **POST /auth/login** with that
email and the exact same password; registration itself never issues a token.

Registration tests use isolated H2 and verify generated IDs/timestamps, the public
DTO and Location (including context paths), input boundaries, BCrypt byte limits,
duplicate prechecks and direct database UNIQUE violations, preservation of existing
accounts, legacy email collisions, log redaction, and registration-to-login compatibility.
Oracle-specific generated-key behavior has not been verified against a live database.

## OpenAPI and Swagger UI (development)

The Spring MVC application uses `springdoc-openapi-starter-webmvc-ui:3.1.1`.
Its [upstream release POM](https://github.com/springdoc/springdoc-openapi/blob/v3.1.1/pom.xml)
targets the same Spring Boot 4.1.0 version as this project. Documentation is disabled
by default and enabled by `dev`; the normal `prod` profile leaves it disabled.
Documentation routes remain public; only the user reads require JWT authentication.
Database initialization behavior is unchanged.

Start **Run Dev** after supplying the local environment described above, or use:

```sh
DEV_DB_RESET=false mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

With the checked-in settings (port 8080, no context path), open:

- Swagger UI: <http://localhost:8080/swagger-ui/index.html>
  (also <http://localhost:8080/swagger-ui.html>, which redirects).
- OpenAPI JSON: <http://localhost:8080/v3/api-docs>
- Swagger UI configuration: <http://localhost:8080/v3/api-docs/swagger-config>

If you override `server.port` / `SERVER_PORT` or
`server.servlet.context-path` / `SERVER_SERVLET_CONTEXT_PATH`, use that port and
prefix all paths with that context path. For example, port 9090 and context path
`/jdbc` give `http://localhost:9090/jdbc/swagger-ui/index.html` and
`http://localhost:9090/jdbc/v3/api-docs`.

First call **POST /auth/login**, then click **Authorize** and paste its `accessToken`
without a `Bearer ` prefix. Expand **GET /users**, choose **Try it out**, then **Execute**. It has no parameters
and returns users ordered by ID, including `[]` for an empty table. For
**GET /users/{id}**, choose **Try it out**, enter an ID from the list, and execute.
The response contains only `id`, `name`, `lastname`, `email`, `createdAt`, and
`updatedAt`; password hashes are never part of this DTO or its schema.
With a valid token, a missing ID returns 404; a nonnumeric value or integer outside the signed 64-bit
range returns 400. There is no positivity constraint on IDs. Unexpected failures
return sanitized 500 responses. Errors use `application/problem+json` (RFC 9457).
Other HTTP methods retain the existing MVC 405 response; the documentation defines
the two implemented GET operations alongside the auth POST operations. These reads do not create or modify data.

`OpenApiDocumentationTest` loads the actual dev web application with a mocked
DataSource and checks both generated operations, response schemas, the ID parameter,
error responses, and Swagger UI assets/configuration pointing to the specification.
The profile tests also check that docs are enabled in dev and disabled in prod.
Run `mvn test` (or `mvn -Dtest=OpenApiDocumentationTest,RuntimeProfilesTest test`).
The OpenAPI test now also checks the HTTP Bearer scheme, security requirements and
401 responses on both user reads, and public login/registration operations. It runs
with the actual security filter chain. These checks pass in the refactored 84-test
suite, including the unchanged registration response schema. The tests use MockMvc
rather than a browser and do not start production or connect to the live Oracle database.

## API errors

Central advice extends Spring's ResponseEntityExceptionHandler, preserving MVC statuses
and headers (400, 404, 405, etc.). Unexpected failures are logged server-side and receive
a generic 500 message. A separate ErrorController handles servlet error dispatches with
the same RFC 9457 `application/problem+json` shape:

```json
{
  "title": "Internal Server Error",
  "status": 500,
  "detail": "An unexpected error occurred.",
  "instance": "/requested-path"
}
```

The default problem type is `about:blank`; Spring may omit this default field from JSON.

## Verification

```sh
mvn test
mvn clean verify
```

Before the package refactor, all **81 existing tests** passed. After moving source
and tests, compilation and **84 tests** passed with `mvn -o -B verify`: all original
behavior checks plus three architecture-boundary checks, with no failures or skips.
Coverage includes H2 JDBC mapping/parameter binding and generated IDs, registration
and login, BCrypt/JWT validation, real security filters, preserved HTTP formats and
errors, OpenAPI/Swagger access, and profile/reset guards.

That `verify` invocation stopped at the JAR packaging phase because Maven JAR plugin
3.5.0 dependencies were not cached (including file-management 3.2.0, maven-archiver
3.6.5, and plexus-archiver 4.10.4). Retrying packaging online with a writable Maven
cache and `-DskipTests package` failed on Maven Central DNS resolution. Executable
JAR creation/repackaging remains unverified; rerun `mvn clean verify` with dependency
access. The POM and its plugin versions were preserved.

Checksums confirm that both `.run` configurations, the local `.env`, application
profiles/resources, POM, and database scripts are unchanged. Relocated production
class bodies are unchanged apart from package/import updates; registration's HTTP
adapter now maps its feature-owned DTO to the same response shape. The composition
root additionally scans the full application package. No live Oracle connection,
database reset, account/password change, or production startup was performed.

H2 tests do not establish live Oracle connectivity or Oracle-specific generated-key
behavior. Mockito uses its subclass mock maker to avoid JVM agent attachment;
change it only if future tests require mocking final/static behavior.
