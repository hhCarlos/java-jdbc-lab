Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-17T18:47:58-06:00

## Task prompt

Create the main application layout in front-end/, following the supplied wireframe.

Follow AGENTS.md and all applicable task prerequisites.

Create three standalone components:
- AppLayout
- Products
- MyProfile

Routing:
- /app uses AppLayout.
- /app/products renders Products inside its router-outlet.
- /app/profile renders MyProfile inside its router-outlet.
- /app redirects to /app/products.
- Preserve the existing authentication routes and root redirect.

AppLayout:
- On desktop, use a left sidebar approximately 14rem wide, with the main content filling the remaining width.
- Place an empty bordered rectangular logo placeholder at the top of the sidebar. Do not invent a logo or load an image.
- Below it, include two navigation links:
  - "Products" → /app/products
  - "My Profile" → /app/profile
- Visually indicate the active link using the existing red accent and aria-current.
- Keep sidebar markup within AppLayout.
- Place the router-outlet inside a semantic main content area.
- Use a viewport-height layout while allowing scrolling as content grows.
- On mobile, place navigation above the content. Use the existing respond(md) mixin to switch to the desktop sidebar arrangement.
- Reuse existing theme, spacing, typography, and border tokens.
- Follow BEM naming and mobile-first styling.

Pages:
- Products contains only a "Products" heading.
- MyProfile contains only a "My Profile" heading.
- Leave the remaining content empty.

Do not add forms, tables, mock data, HTTP integration, authentication guards, additional navigation items, or backend changes.

Verify that the Angular build succeeds and report the routes and component structure.

Follow-up instruction: you can do it now
