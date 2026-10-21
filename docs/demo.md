# Disposable full-stack demo

Prerequisites: a Mac with Apple Silicon (including M4), Docker Desktop with the
daemon running, Docker Compose v2.20+ (or v5), Python 3, and Bash. Internet access
is needed to pull images and download Maven/npm dependencies. Java, Maven, Node,
and Nginx run inside the builds/containers. Allow Docker Desktop at least 12 GB
of memory: Oracle data uses an 8 GiB tmpfs ceiling in addition to database and
application memory. Actual memory use grows with data; tmpfs is not a disk volume.
Keep host port 8081 available. First builds and Oracle extraction can take minutes.

## Configure and start

From the repository root:

```sh
cp .env.demo.example .env.demo
chmod 600 .env.demo
# Generate two separate passwords (prefix each generated value with a letter):
openssl rand -hex 24
openssl rand -hex 24
# Generate a separate JWT key:
openssl rand -base64 32
```

Put those values in `.env.demo`, replacing every placeholder. Use plain, unquoted
`KEY=value` entries with only the three template keys. Passwords must start with a
letter and contain 12-128 alphanumeric characters. The JWT key must be Base64 of
at least 32 random bytes. Do not reuse local or production credentials. The file
is ignored by Git and excluded from both build contexts; secrets are passed only
to the Oracle/backend runtime environments, never into frontend assets or images.
Docker administrators can inspect runtime environment values.

```sh
./scripts/demo-up.sh
```

The script also works when invoked by absolute path from another directory. It
validates configuration without displaying values, uses only `compose.demo.yaml`
and the explicit project `jl-store-demo`, removes that project's previous service
containers, builds, starts, and waits for all healthchecks. It never merges
`compose.yaml`, reads the local `.env`, or removes local database volumes.
Builds have a 30-minute deadline; service readiness has a 20-minute deadline.
Failure returns nonzero and prints scoped diagnostics. Containers are retained
on failure for inspection; use the shutdown command below afterward.

Open <http://127.0.0.1:8081>. Register a new user to explore authenticated features.
There are no pre-created application accounts or products.

## Data and initialization ownership

**Every invocation of `demo-up.sh` destroys previous demo data.** Oracle uses
`gvenzl/oracle-free:23.26.3-slim`, `linux/arm64`, with explicit tmpfs at
`/opt/oracle/oradata`. There are no persistent or anonymous database volumes.
Stopping Oracle loses its tmpfs data too. Use `demo-up.sh` to start again; it
recreates containers so image extraction and initialization start from clean
container files as well as clean storage. Plain `docker compose restart` is not
the supported fresh-demo entry point.

The Oracle initialization hook `infra/demo/init.sh` is the sole provisioning and
schema owner. It runs the existing `infra/database/setup.sql` to create
`STORE_JDBC` in `FREEPDB1` with the documented grants/quota, then connects as
`STORE_JDBC` and runs the canonical `infra/database/tables` SQL: users, statuses,
products/index, and the status seed. The model and existing SQL are unchanged.
Only ACTIVE, INACTIVE, and DELETED lookup records are inserted. A read-only
assertion verifies empty USERS/PRODUCTS and the exact canonical statuses before
writing a readiness marker inside tmpfs. SQL*Plus errors abort initialization.

The hook uses the image's first-start initialization mechanism:
[Oracle image documentation](https://github.com/gvenzl/oci-oracle-free#initialization-scripts)
and [entrypoint implementation](https://github.com/gvenzl/oci-oracle-free/blob/main/container-entrypoint.sh).
Canonical SQL is copied outside the recursively executed hook directory so it
is executed only by the hook, under the application account.
The thin Oracle image uses the exact required base tag and packages initialization
files without host bind mounts, so Docker Desktop file sharing is not required.

Oracle health requires the marker, the image healthcheck, and read-only table and
canonical-status checks. Backend startup depends on Oracle health. The backend
uses Java 17, Maven packaging with test compilation/execution skipped, and the
existing `prod` profile with demo-only `PROD_*` variables. Spring SQL initialization
remains `never`; the destructive dev reset bean is excluded by profile. No setup
helper verification probes, development fixtures, or automated test suites run.

Backend health calls `GET /catalog/products?pageSize=1`, exercising HTTP and a
database query. Frontend health checks both static serving and the proxied catalog.
Node 24 builds Angular with `npm ci`; Nginx serves the production output, forwards
`/api/` to `backend:8080/` (removing `/api`), and falls back to `index.html` for deep
links. Oracle and backend have no published host ports.

## Diagnostics and shutdown

Run these from the repository root (the script prints absolute-path equivalents):

```sh
docker compose -p jl-store-demo --env-file .env.demo -f compose.demo.yaml ps
docker compose -p jl-store-demo --env-file .env.demo -f compose.demo.yaml logs --tail=100 oracle backend frontend
docker compose -p jl-store-demo --env-file .env.demo -f compose.demo.yaml exec -T oracle bash /opt/demo/ready.sh
curl --fail http://127.0.0.1:8081/api/catalog/products
curl --fail http://127.0.0.1:8081/login
docker compose -p jl-store-demo --env-file .env.demo -f compose.demo.yaml down --timeout 30
```

Shutdown discards the demo database. Do not use these commands with another
project name. The existing local Compose environment and its `oracle-data` volume
are independent and are never used by this demo.
