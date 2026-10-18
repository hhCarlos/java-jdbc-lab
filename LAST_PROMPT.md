Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-17T18:59:32-06:00

Task prompt:
Configure only the Angular development proxy in front-end/.

Follow AGENTS.md and all applicable task prerequisites.

Requirements:
- Route requests under /api/ to the local Spring Boot backend.
- Remove the /api prefix before forwarding. For example, /api/auth/register must reach /auth/register on the backend.
- Confirm the actual backend port from existing documentation or configuration using read-only inspection.
- Use the proxy format and path matching supported by the application's Angular 21 builder.
- Configure the existing npm start / Angular serve setup to load the proxy automatically.
- Keep Angular page routes, including /auth and /app, outside the proxy.
- Do not change backend routes, Spring Security, or CORS configuration.
- Do not add HTTP services, form integration, credentials, or Docker changes.

Document the local startup commands and explain that the backend must be running separately.

Verify that the frontend builds and starts with the proxy configuration. If the backend is available, verify forwarding with a harmless read-only request to an existing public endpoint. Otherwise, state that end-to-end forwarding remains unverified.

Report changed files, the proxy target, and an example mapping from a frontend URL to the corresponding backend URL.
