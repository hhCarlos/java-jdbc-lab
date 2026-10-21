# Latest task prompt

Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-20T17:06:25-06:00

## Task prompt

Add an owner-scoped soft-delete operation to the existing backend products repository.

Follow AGENTS.md and all applicable database rules. Inspect the existing repository, JDBC implementation, status lookup conventions, and tests.

Requirements:
- Extend the existing repository abstraction and implementation.
- Use a clear method name such as softDeleteByIdAndOwnerId.
- Accept product ID and owner user ID.
- Change only status_id to the ID associated with code DELETED.
- Perform the change in one atomic, parameterized UPDATE.
- Include product ID, ownership, and allowed current statuses in the SQL conditions.
- Allow deletion of ACTIVE and INACTIVE products.
- Return the affected-row result.
- Return no matching update for missing, already-deleted, or another user's products.
- Preserve the product row, ownership, and all other data.
- Do not implement physical deletion, recovery, schema changes, services, controllers, or frontend changes.

Add focused repository tests covering:
- Deleting active and inactive products.
- Ownership isolation.
- Missing and already-deleted products.
- Preservation of other product fields.
- Deleted products being excluded by existing owner and public lookup/listing operations.

Run relevant tests using the existing isolated test setup. Report results, show the final SQL and parameter order, and distinguish Oracle verification from H2 or mocked tests.
