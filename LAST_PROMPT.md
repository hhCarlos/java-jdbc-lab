# Latest task prompt

Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-20T22:09:02-06:00

## Task prompt

Reorganize the project documentation into three clear, concise entry points.

Follow AGENTS.md and all applicable task prerequisites. This is a documentation-only task.

Inspect the existing documentation, build files, workflows, configuration, and startup scripts to ensure every documented version and command matches the implementation. Do not read or expose secret values.

### 1. Root README.md

Present the complete full-stack project:

- Project name and a brief description of this Java/JDBC and Angular laboratory developed with AI-assisted workflows.
- Existing features.
- Technology stack and declared versions.
- Local development requirements, environment configuration, database initialization, and commands to start the backend and frontend.
- A short disposable-demo setup section covering requirements, initial `.env.demo` configuration, `./scripts/demo-up.sh`, application URL, and shutdown command.
- Clearly state that every invocation of demo-up.sh destroys previous demo data and starts with empty application tables plus reference statuses.
- Links to the architecture documentation, frontend README, and existing agent workflow instructions.

Place the existing GitHub Actions workflow status badge near the top, using the actual repository and workflow filename.

Only add coverage badges if real coverage reports and a working reporting integration already exist. Do not invent percentages, add placeholder badges, or introduce coverage tooling in this task. Report what is missing if coverage badges cannot currently be supported.

Keep the README easy to scan. Move detailed implementation explanations into the architecture document.

### 2. docs/architecture/README.md

Document:

- A concise repository directory tree with the relevant directories.
- Backend feature organization and the responsibilities of domain, application, and infrastructure layers.
- Dependency direction.
- Frontend organization at a high level.
- Database initialization ownership.
- The difference between local development storage and disposable demo storage.
- Demo startup dependencies, readiness checks, proxy behavior, and troubleshooting details currently documented elsewhere.

Reference existing canonical documentation and scripts rather than duplicating their contents. Link to the existing database model and rules.

### 3. front-end/README.md

Replace generic scaffold documentation with project-specific instructions:

- Brief purpose and current features.
- Angular, Node.js, and package-manager versions or supported ranges as declared by the project.
- Prerequisites and dependency installation.
- Development server command and URL.
- Development API proxy behavior and the backend prerequisite.
- Existing test and production-build commands.
- A concise directory tree explaining features, layouts, shared components, services, models, and styles where they actually exist.
- A link to the root README for the complete Docker demo.

Use a consistent style across all three documents and write everything in English.

Preserve necessary operational instructions, including environment setup and the demo memory requirement. Distinguish declared prerequisites from verified behavior.

Do not change application code, dependencies, workflows, Docker configuration, database scripts, or runtime behavior. Do not start containers or execute destructive setup commands.

Check Markdown formatting, relative links, and command accuracy against the repository. Fix references affected by moving documentation, and avoid leaving conflicting setup instructions.

Report the documentation changes, verification performed, coverage badge availability, and every file added, modified, deleted, or renamed.
