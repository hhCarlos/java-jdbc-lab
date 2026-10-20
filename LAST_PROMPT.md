# Latest task prompt

Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-19T19:30:01-06:00

## Task prompt

Add an Edit action to the Products table and prepare the existing ProductForm page for edit routing.

Follow AGENTS.md and all applicable task prerequisites.

Products table:
- Use the shared table's existing actions template.
- Add an Edit button using AppButton and the registered "edit" icon.
- Clicking it navigates to /app/products/edit/{productId}.
- Preserve listing, pagination, and loading behavior.

Add this route alongside the existing creation route:

{
  path: 'products/edit/:id',
  loadComponent: () =>
    import('./features/products/product-form/product-form')
      .then(m => m.ProductForm),
  data: {
    mode: 'edit',
    pageTitle: 'Edit product',
    pageSubtitle: 'Update your product details.',
  },
}

ProductForm:
- Reuse the existing component.
- Resolve mode from route data rather than parsing URL strings.
- Read and validate the product ID in edit mode according to the existing ID model.
- Preserve the complete creation flow unchanged.
- Editing services are not implemented yet: show an English message explaining that editing is not available, and disable editing/submission.
- Never call create() from edit mode, including programmatic submission.
- Do not fabricate product data or reuse the public catalog endpoint to load an owner's product.
- Keep Cancel navigation back to /app/products.
- Invalid IDs must display a clear error and must not enable submission.

Do not add backend endpoints or frontend editing services yet.

Update focused tests for Edit navigation, route metadata, mode handling, invalid IDs, and preventing creation from edit mode. Run relevant tests and the Angular build, and report results.
