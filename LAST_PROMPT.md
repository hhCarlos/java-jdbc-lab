Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-18T14:48:07-06:00

Task prompt:

Protect the application area and implement logout through the existing sidebar menu.

Follow AGENTS.md and all applicable task prerequisites. Reuse the existing session service and HTTP interceptor.

Route protection:
- Add functional Angular guards protecting /app and its child routes.
- Allow access only when the session service has a usable, unexpired token.
- Otherwise, return a redirect to /auth/login using the router's guard redirect mechanism.
- Keep /auth/login and /auth/register publicly accessible.
- Preserve existing routes and layouts.
- Remember that frontend guards control navigation; backend authorization remains authoritative.

Logout:
- Add a semantic button labeled exactly "cerrar sesion" to the existing sidebar navigation.
- Style it consistently with the menu, supporting keyboard interaction and both themes.
- On activation, clear all in-memory session state and navigate to /auth/login with replaceUrl.
- Do not call a nonexistent logout endpoint.
- Verify that browser Back cannot restore access to guarded pages after logout.

Expired or rejected authentication:
- When an authenticated request to this application's protected API returns 401, clear the matching current session and redirect to login.
- Preserve the HTTP error for the caller.
- Do not apply this behavior to login failures, registration, public requests, external URLs, or 403 responses.
- A delayed 401 from an old token must not clear a newer session.
- Avoid redirect loops and repeated navigation from concurrent failures.

Do not add persistent storage, refresh tokens, roles, backend changes, or automatic retry of failed requests.

Add focused tests covering authenticated and unauthenticated route access, expired sessions, logout, protected-request 401 handling, and exclusion of login failures and stale-token responses.

Run the relevant tests and Angular build. Report results and manual verification steps.
