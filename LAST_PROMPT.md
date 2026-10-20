# Latest task prompt

Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-19T20:53:59-06:00

## Task prompt

Implement product-update integration in front-end/, reusing the existing ProductForm edit flow.

Follow AGENTS.md and all applicable task prerequisites.

ProductsService:
- Add update(id, request) using PUT /api/users/me/products/{id}.
- Use typed request and response models matching the backend contract.
- Send title, price, description, and stock only.
- Rely on the existing bearer interceptor.
- Return an Observable and preserve HTTP errors.

ProductForm:
- In edit mode, display "Save changes" and call update() with the validated route ID.
- Preserve create mode and its existing create() call.
- Enable edit submission only after product loading succeeds, the form is valid, and changes have been made.
- Disable submission during validation or an active request.
- Remove the placeholder stating that editing is unavailable.
- Preserve numeric validation without silent rounding or truncation.
- Show the existing global loader immediately before sending the update.
- Prevent duplicate submissions and release the loader on success, failure, or cancellation.

Success:
- Mark the form pristine.
- Navigate to /app/products and retrieve a fresh server-side listing.

Failure:
- Preserve entered values and remain on the form.
- Reuse existing error handling and generic console feedback.
- Preserve authentication-expiry handling.

Keep dirty-form cancellation confirmation, existing table navigation, and product-loading behavior unchanged. Do not modify backend code or add new notifications.

Add focused tests covering the PUT request, create/edit dispatch, successful navigation, failed updates preserving values, submission eligibility, and loader cleanup.

Run relevant frontend tests and the Angular build. Report results and manual verification steps.
