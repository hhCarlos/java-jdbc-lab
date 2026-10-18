# Latest task prompt

Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-17T19:35:28-06:00

## Task prompt

Extend the existing GitHub Actions CI workflow to validate both backend and frontend.

Follow AGENTS.md and all applicable task prerequisites. Inspect the current workflow and package scripts before making changes.

Keep two independent jobs:

Backend:
- Preserve the existing Java 17 setup, Maven caching, and test execution.
- Preserve failure-report uploads.

Frontend:
- Use Node.js 24.
- Set the working directory to front-end/.
- Cache npm downloads using front-end/package-lock.json.
- Install dependencies with npm ci.
- Run the complete frontend test suite once in non-interactive mode.
- Use the actual configured test runner and supported flags; do not leave watch mode enabled.
- Build the Angular application using the existing build script.
- Upload test reports on failure if the runner generates them.

General requirements:
- Run both jobs on the existing pull-request, default-branch push, and manual triggers.
- Keep workflow permissions minimal.
- Tests must not require local .env files, real credentials, or developer services.
- Do not skip failing tests or change application behavior to make CI pass.
- Do not add deployment or Docker builds.
- Reuse the existing workflow rather than creating duplicate workflows.

Run the corresponding backend tests, frontend tests, and frontend build locally. Validate the workflow configuration.

Report changed files, exact commands, and results. Distinguish local verification from the GitHub-hosted execution, which must be checked after pushing.
