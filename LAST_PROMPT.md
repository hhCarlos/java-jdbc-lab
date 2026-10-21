Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-20T19:29:42-06:00

Task prompt:

Extend backend product creation to support saving a product as inactive.

Follow AGENTS.md and all applicable database rules.

Endpoint:
POST /users/me/products

Add an optional Boolean active field to the creation request.

Business rules:
- active=false creates an INACTIVE product, regardless of positive stock.
- active=true creates ACTIVE only when stock is greater than zero.
- Zero stock always creates INACTIVE.
- When active is omitted or null, preserve existing behavior: positive stock creates ACTIVE; zero stock creates INACTIVE.
- Use existing status codes ACTIVE and INACTIVE. Do not introduce a DRAFT status.
- Never allow creation as DELETED.

Implementation:
- Extend request binding and application/domain logic.
- Preserve existing field validation and authenticated ownership resolution.
- Do not accept owner IDs, raw status IDs, or status codes from the client.
- Reuse the repository's existing status-code insertion capability.
- Update affected service signatures and TransactionalProductService overrides so transaction handling remains effective.
- Return the authoritative resulting status through the existing response structure.
- Preserve PUT behavior and all other product operations.
- Update OpenAPI and relevant business-rule documentation.
- Do not change the database schema or front-end/.

Test explicit active=false with positive stock, active=true with positive stock, zero-stock precedence, omitted/null compatibility, and existing ownership and validation behavior.

Run relevant backend tests. Report results and provide example payloads for normal publication and saving as inactive.
