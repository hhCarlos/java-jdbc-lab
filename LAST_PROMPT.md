Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-20T20:36:28.504900-06:00

Task prompt:

Implement a reproducible, disposable full-stack demo started with:

./scripts/demo-up.sh

Follow AGENTS.md and all applicable task prerequisites and database rules.

Inspect the existing initialization scripts, Spring profiles, Maven packaging, Angular build configuration, and Oracle image behavior before implementing.

Demo contract:
- Every invocation starts a fresh demo database.
- Initialize the application schema and the three canonical product statuses only.
- USERS and PRODUCTS must start empty.
- Do not run development fixture resets, verification inserts, or automated test suites during startup.
- Preserve the existing local Compose environment and its oracle-data volume.

Compose:
- Create a standalone compose.demo.yaml, without merging the existing Compose file.
- Use the explicit project name jl-store-demo.
- Include oracle, backend, and frontend services.
- Use gvenzl/oracle-free:23.26.3-slim with architecture compatible with the target Mac M4.
- Store Oracle data on explicit tmpfs storage at /opt/oracle/oradata. Do not use persistent or anonymous database volumes.
- Do not publish Oracle or backend ports to the host.
- Publish the frontend on 127.0.0.1:8081.

Initialization:
- Automatically provision STORE_JDBC in FREEPDB1.
- Reuse canonical database SQL, preserving the documented schema.
- Run DDL under the correct application schema and seed only the status lookup.
- Establish one initialization owner.
- Ensure Oracle readiness requires successful application-schema initialization, not merely a running database.
- Fail clearly if initialization fails.

Backend:
- Add a multi-stage Dockerfile using Java 17 and the project's Maven build.
- Run with the existing prod profile and demo-specific environment configuration.
- Connect to oracle:1521/FREEPDB1.
- Preserve disabled Spring SQL initialization and exclude the destructive dev reset.
- Wait for schema readiness and provide a meaningful backend readiness check.

Frontend:
- Build the existing Angular application using Node 24 and npm ci.
- Serve compiled files with Nginx.
- Proxy /api/ to backend:8080, stripping /api.
- Support Angular deep links through the index.html fallback.
- Keep secrets out of frontend assets and image layers.

Configuration and script:
- Add suitable .dockerignore files.
- Provide .env.demo.example with placeholders and ignore .env.demo.
- Validate required configuration without printing secrets.
- demo-up.sh must resolve paths independently of the caller's directory.
- Recreate only the explicitly named demo project, build/start services, wait for readiness with bounded timeouts, and return nonzero on failure.
- Never remove unrelated containers or volumes, prune Docker, or modify the existing local database.
- Print the demo URL and useful scoped diagnostic commands.

Document prerequisites, environment setup, startup, shutdown, and the disposable-data behavior. Do not implement demo-test.sh, sample business data, third-party integrations, or reports.

Validate Compose configuration and, if Docker is available, build and start the demo. Verify schema readiness, exactly three canonical statuses, empty application tables, frontend routing, and API forwarding. Verify restart initialization without leaving sample rows.

If runtime verification is blocked, report the exact blocker and do not claim success. Report changed files and checks according to repository workflow rules.
