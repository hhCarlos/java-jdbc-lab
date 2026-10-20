# Task prompt

Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-19T20:06:43-06:00

## Task prompt

Load the selected product into the existing ProductForm edit page. Limit implementation changes to front-end/ and the task record required by AGENTS.md.

Follow AGENTS.md and all applicable task prerequisites.

ProductsService:
- Add or reuse getById() calling GET /api/users/me/products/{id}.
- Use typed models matching the existing backend response.
- Rely on the existing authentication interceptor.
- Return an Observable and preserve HTTP errors.

Edit flow:
- Preserve the table's existing Edit navigation to /app/products/edit/{id}.
- Fetch the product from ProductForm using the validated route ID, not from the table click handler.
- Request data only in edit mode.
- Populate title, price, description, and stock using the existing form-control representations without silently rounding values.
- Mark the populated form pristine and untouched.
- Handle route-ID changes without letting stale responses overwrite the current product.
- Clean up subscriptions and loading state on completion or cancellation.
- Preserve dirty-form Cancel confirmation.

Loading and errors:
- Do not allow editing before loading succeeds.
- Show loading feedback using existing conventions.
- For 404, show an English product-unavailable message and a way back to Products.
- For other recoverable failures, show feedback and allow retry.
- Preserve existing authentication-expiry handling.

Saving edits is not implemented yet:
- Keep edit submission disabled.
- Never call create() from edit mode.
- Preserve the complete creation flow unchanged.

Do not change backend code or add update requests.

Add focused tests for the GET request, form population, missing products, loading/error recovery, create-mode isolation, and preventing creation from edit mode.

Run relevant frontend tests and the Angular build. Report results and manual verification steps.
