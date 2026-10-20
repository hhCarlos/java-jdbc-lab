Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-19T19:45:17-06:00

Task prompt:

Add a repository operation for retrieving one product owned by a specific user.

Follow AGENTS.md and all applicable database rules. Inspect the existing products repository, JDBC implementation, domain models, and owner-listing query.

Requirements:
- Extend the existing repository abstraction and JdbcTemplate implementation.
- Accept both product ID and owner user ID, using existing ID types.
- Use a clear method name such as findByIdAndOwnerId.
- Return Optional of the existing appropriate product model.
- Filter by product ID and user_id in the SQL query itself.
- Include ACTIVE and INACTIVE products, including products with zero stock.
- Exclude DELETED products using stable status codes and existing query conventions.
- Return Optional.empty() when the product does not exist, belongs to another user, or is deleted.
- Use parameterized SQL and reuse the existing row mapper where appropriate.
- Return the fields needed by the edit form, including description and status code.
- Preserve existing listing, creation, and public catalog behavior.

Do not add application services, controllers, JWT handling, frontend changes, or schema changes.

Add focused repository tests covering:
- An owner retrieves their product.
- Another owner's product is not returned.
- Missing and deleted products are not returned.
- Inactive and zero-stock products remain retrievable by their owner.

Run the relevant tests. Report results, show the final SQL and parameter order, and distinguish actual database verification from mocked tests.
