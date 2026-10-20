Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-19T19:51:53-06:00

Task prompt:

Expose the existing owner-scoped product lookup through the application service and REST controller.

Follow AGENTS.md and all applicable task prerequisites.

Endpoint:
GET /users/me/products/{id}

Requirements:
- Add the lookup use case to the existing products application layer.
- Delegate persistence to the repository operation already implemented.
- Keep the application service independent of HTTP and Spring Security types.
- Add the endpoint to the existing owner-products controller.
- Require a valid bearer JWT.
- Resolve the owner through the same authenticated-user mechanism as existing owner-product operations.
- Never accept an owner user ID from the client.
- Validate the product ID according to existing conventions.
- Return HTTP 200 with the product's ID, title, price, description, stock, and status code.
- Return the same HTTP 404 response when the product is missing, belongs to another user, or is deleted.
- Allow owners to retrieve inactive and zero-stock products.
- Preserve existing authentication behavior, including handling a nonexistent authenticated account.
- Reuse existing response models and exception handling where appropriate.
- Document the endpoint and bearer requirement in OpenAPI.

Preserve existing listing, creation, and public catalog behavior. Do not add update operations, frontend integration, or schema changes.

Add focused service and HTTP/security tests covering successful retrieval, ownership isolation, missing/deleted products, inactive/zero-stock products, invalid IDs, and missing/invalid authentication.

Run relevant tests and report results. Provide a sample authenticated request using the application's configured port.
