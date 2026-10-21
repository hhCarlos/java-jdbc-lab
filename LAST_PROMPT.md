# Latest task prompt

Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-20T18:29:48-06:00

## Task prompt

Expose product soft deletion through the application service and existing owner-products controller.

Follow AGENTS.md and all applicable task prerequisites. Reuse the repository soft-delete operation already implemented.

Endpoint:
DELETE /users/me/products/{id}

Requirements:
- Require a valid bearer JWT.
- Resolve the owner through the existing authenticated-user mechanism.
- Never accept an owner user ID or target status from the client.
- Keep the application service independent of HTTP and Spring Security types.
- Validate the product ID using existing conventions.
- Delegate to the owner-scoped repository operation within a transaction.
- Check the affected-row result.
- Return HTTP 204 with no response body when deletion succeeds.
- Return the same HTTP 404 response for missing, already-deleted, or another user's products.
- Preserve existing authentication behavior, including nonexistent authenticated accounts.
- Allow soft deletion of ACTIVE and INACTIVE products.
- Change publication status to DELETED while preserving the row and all other data.
- Do not perform physical deletion or implement recovery.

Document the endpoint, bearer requirement, soft-delete semantics, and responses in OpenAPI. Update relevant business-rule documentation.

Preserve existing product operations and security configuration. Do not introduce roles, schema changes, or frontend integration.

Add focused service and HTTP/security tests for successful deletion, ownership isolation, missing/already-deleted products, invalid IDs, and missing/invalid/expired authentication. Verify deleted products are unavailable through existing listings and lookups.

Run relevant tests and report results. Provide a sample authenticated DELETE request using the configured application port.
