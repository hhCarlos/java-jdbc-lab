Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-18T18:57:29-06:00

Task prompt:

Add the product-creation page and navigation from the existing Products listing.

Follow AGENTS.md and all applicable task prerequisites.

Navigation:
- Add the shared AppButton above the products table, labeled "New product".
- Navigate to /app/products/create.
- Preserve the existing listing, status column, and pagination.

Routing and page:
- Create a ProductForm page within the products feature, designed for later reuse when editing.
- Register /app/products/create under the existing guarded application area.
- Declare mode: "create" in route data.
- Add pageTitle: "New product" and an appropriate pageSubtitle for the existing layout header.
- Preserve /app/products as the listing route.
- Do not register an unfinished edit route or implement edit behavior yet.

Form:
- Use reactive forms with title, price, optional description, and stock.
- Match validation to the existing backend creation contract, inspecting it read-only as needed.
- Do not expose owner ID or publication status as editable fields.
- Use English labels and accessible validation feedback.
- Reuse the shared button, styling tokens, BEM conventions, and existing form patterns.
- Provide a Cancel action returning to /app/products.

Keep submission local for now. Do not call the creation endpoint, display fake success, or modify the backend.

Avoid speculative abstractions for editing; keep the form structure ready to initialize from product data later.

Verify navigation and validation, run relevant tests and the Angular build, and report results.
