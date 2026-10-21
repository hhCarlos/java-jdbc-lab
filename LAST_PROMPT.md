Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-20T18:41:22-06:00

Task prompt:
Add soft-delete support to the existing frontend ProductsService.

Follow AGENTS.md and all applicable task prerequisites. Limit application changes to front-end/.

Requirements:
- Add a method such as deleteById(id).
- Send DELETE /api/users/me/products/{id} through the existing proxy.
- Use the existing product ID type and validation conventions.
- Do not send a request body, owner ID, or status value.
- Rely on the existing interceptor for bearer authentication.
- Handle the backend's 204 No Content response using Observable<void>.
- Return the Observable without subscribing inside the service.
- Preserve HTTP errors for the caller and keep existing authentication handling unchanged.
- Preserve all existing product service operations.

Do not connect buttons, add confirmation dialogs, notifications, loaders, navigation, or backend changes.

Add focused HTTP tests covering the DELETE method and URL, absence of a body, successful empty response, invalid IDs, and error propagation.

Run relevant frontend tests and the Angular build. Report results and provide a minimal service usage example.
