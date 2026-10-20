# Latest task prompt

Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-19T19:18:16-06:00

## Task prompt

Connect the existing product-creation form to ProductsService.create().

Follow AGENTS.md and all applicable task prerequisites. Reuse the existing typed service contract, global loader, and submission conventions.

Submission:
- Submit only when the form is valid and no request is pending.
- Map form values to the service's request types without silently rounding or truncating numbers.
- Send only title, price, description, and stock.
- Show the global blocking loader immediately before sending the request and keep it visible while awaiting the response.
- Prevent duplicate submissions.
- Always release the loader and reset submission state on success, error, or cancellation, using finalize and proper subscription cleanup.

Success:
- Mark the form pristine after the backend confirms creation.
- Navigate to /app/products.
- Ensure the Products page fetches a fresh list from the backend when entered, preserving server-side pagination.
- Avoid stale cached results or duplicate fetches.
- Remove the placeholder message stating that saving is unavailable.

Failure:
- Stay on the creation page and preserve entered values for retry.
- For now, log only this generic message:
  console.log('Unable to create product. Please try again.');
- Do not log the request body, token, or raw error object.
- Preserve existing authentication-expiry handling.

Preserve validation, disabled-button behavior, and dirty-form cancellation confirmation. Do not modify the backend or add notifications or unrelated features.

Add focused tests covering successful creation and navigation, fresh listing retrieval, failed submission preserving values, duplicate-submit prevention, and loader cleanup.

Run relevant tests and the Angular build. Report results and manual verification steps.
