# Latest task prompt

Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-19T20:42:52-06:00

## Task prompt

Implement the product-update application service and expose it through the existing owner-products controller.

Follow AGENTS.md and all applicable task prerequisites. Reuse the repository update operation already implemented.

Endpoint:
PUT /users/me/products/{id}

Request:
- title: required, nonblank, maximum 50 characters.
- price: required, non-negative, fitting NUMBER(12,2) without silent rounding.
- description: optional; omitted or null clears the description.
- stock: required, non-negative whole number within the database column's range.

Application behavior:
- Resolve ownership from the existing authenticated-user mechanism.
- Keep application services independent of HTTP and Spring Security types.
- Load the owner's current product and apply existing business rules.
- ACTIVE with new stock zero becomes INACTIVE.
- ACTIVE with positive stock remains ACTIVE.
- INACTIVE remains INACTIVE, including when restocked.
- Never update or restore DELETED products.
- Do not expose owner ID or status as writable request fields.
- Perform lookup, status decision, update, and response retrieval within one transaction.
- Check the repository's affected-row result; never report success when nothing was updated.
- Preserve product ID and ownership.
- Never create a product when the requested ID does not exist.

Controller:
- Require a valid bearer JWT.
- Validate the path ID and request using existing conventions.
- Return 200 with the updated product.
- Return the same 404 response for missing, deleted, or another user's product.
- Return 400 for invalid input.
- Preserve existing authentication and exception handling.
- Document the endpoint, replacement semantics, and responses in OpenAPI.

Preserve existing creation, listing, lookup, and public catalog behavior. Update relevant business-rule documentation where needed. Do not modify the frontend or schema.

Add focused service and HTTP/security tests for successful updates, validation, ownership isolation, status transitions, description clearing, repeated identical requests, and missing authentication.

Run relevant tests. Report results and provide a sample authenticated PUT request.
