Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-20T18:58:55-06:00

Task prompt:

Extend the backend product-update operation to support owner-controlled publication through an optional Boolean active field.

Follow AGENTS.md and all applicable database rules.

Endpoint:
PUT /users/me/products/{id}

Business rules:
- Stock zero always results in INACTIVE, regardless of active.
- With positive stock:
  - active=false results in INACTIVE.
  - active=true results in ACTIVE.
  - active omitted or null preserves the current publication status.
- DELETED products remain unavailable and cannot be restored through PUT.
- Changing stock alone must not reactivate an inactive product.

Implementation:
- Extend the update request and application/domain logic.
- Keep existing required fields and validation unchanged.
- Obtain ownership from authentication.
- Do not accept raw status IDs, status codes, or owner IDs as writable fields.
- Reuse the repository's existing target-status-code update capability.
- Save editable fields and the resulting status atomically.
- Update all affected service signatures and the TransactionalProductService override so transaction handling remains effective.
- Preserve the response structure and return the resulting authoritative status.
- Preserve existing 400, 401, and 404 handling.
- Do not add a database column or change the status lookup table.
- Keep POST creation behavior unchanged.

Update OpenAPI and business-rule documentation to explain active, stock precedence, and backward-compatible omission behavior.

Test suspension, explicit reactivation, zero-stock precedence, omitted/null active, ownership isolation, and deleted-product protection. Preserve existing update tests.

Run relevant backend tests and report results with example PUT payloads. Do not modify front-end/.
