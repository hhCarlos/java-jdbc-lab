Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-18T17:21:58-06:00

Task prompt:

Create a minimal reusable standalone AppTable component in the frontend shared component structure, following the supplied wireframe.

Follow AGENTS.md and all applicable task prerequisites.

Component API:
- Accept a typed collection of rows.
- Accept typed column definitions containing a property key and a header label.
- Property keys must correspond to fields of the row type.
- Accept a rowKey identifying the property used to track rows.
- Accept an optional actionsTemplate receiving the current row as its implicit context.
- Support an optional cell template per column for custom formatting, also receiving the current row.
- Default cells display the corresponding property value as text.
- Preserve zero and false values. Display a neutral placeholder for null or undefined.
- Avoid any, innerHTML, and product-specific logic.

Rendering:
- Use a semantic HTML table with thead, tbody, and column-header scopes.
- Render an additional "Actions" column only when an actions template is supplied.
- Action buttons and their handlers belong to the consuming page's template.
- Show a configurable empty-state message spanning all visible columns.
- Use a horizontally scrollable wrapper on narrow screens.
- Reuse theme tokens, typography, spacing, and BEM conventions.
- Treat the sketch as a structural reference; use a clean header and aligned rows rather than separate oversized cards for every cell.

Keep the table presentational. Do not add HTTP calls, pagination, sorting, filtering, selection, or editing logic.

Document a usage example with ID, Title, Price, Stock, and an actions template. Demonstrate custom price formatting without hardcoding a currency inside the shared component.

Do not connect the Products page yet or modify the backend.

Add focused tests for column mapping, zero values, empty state, custom cell rendering, and actions receiving the correct row.

Run relevant tests and the Angular build. Report the public API and verification results.
