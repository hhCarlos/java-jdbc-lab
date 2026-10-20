# Latest task prompt

Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-19T20:35:08-06:00

## Task prompt

Add an owner-scoped product update operation to the existing backend repository.

Follow AGENTS.md and all applicable database rules. Inspect the existing repository abstraction, JDBC implementation, product models, and status lookup conventions.

Requirements:
- Extend the existing repository rather than creating a parallel implementation.
- Accept product ID, owner user ID, replacement title, price, optional description, stock, and the target status code supplied by the application layer.
- Use BigDecimal for price and existing types for IDs and stock.
- Update editable fields and status together in one parameterized SQL statement.
- Resolve the target status through its stable code using existing conventions.
- Include product ID, owner user ID, and allowed current statuses in the UPDATE conditions.
- Only ACTIVE and INACTIVE products may be updated. Never update or restore DELETED products.
- Preserve product ID and ownership.
- Treat a null description as clearing the stored description.
- Do not insert when no matching product exists.
- Return an affected-row result allowing the application layer to distinguish a successful update from no matching product.
- Leave business validation and the decision about the target status to the application layer.

Do not add services, controllers, frontend changes, migrations, or automatic commits.

Add focused repository tests covering:
- Updating all supplied fields and status.
- Clearing the description.
- Ownership isolation.
- Missing and deleted products remaining unchanged.
- Updating inactive products.
- An invalid target status failing without partially changing product data.

Run relevant tests using the existing isolated database setup. Report results, show the final SQL and parameter order, and distinguish Oracle verification from H2 or mocked tests.
