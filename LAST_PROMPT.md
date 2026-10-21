Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-20T19:39:40-06:00

Task prompt:

Align the frontend product-creation request with the backend's new active property.

Follow AGENTS.md and all applicable task prerequisites. Limit application changes to front-end/.

Requirements:
- Add active?: boolean to the existing creation-request model.
- Ensure ProductsService.create() forwards an explicitly supplied active value.
- Preserve active=false; do not drop it through truthiness checks or replace it with a default.
- When active is omitted, preserve the existing payload behavior and let the backend apply its default rules.
- Keep response types aligned with the existing authoritative product status.
- Do not send raw status IDs or status codes.

Keep existing form behavior unchanged. Do not add controls, buttons, publication decisions, backend changes, or modify the update operation.

Add focused HTTP tests verifying creation payloads with active=false, active=true, and active omitted. Preserve existing creation tests.

Run relevant frontend tests and the Angular build. Report results and list changed files according to the workflow rules.
