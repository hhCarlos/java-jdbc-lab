# Latest task prompt

Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-18T15:28:21-06:00

## Task prompt

Add a reusable PageHeader component and integrate it into AppLayout using the existing route metadata.

Follow AGENTS.md and all applicable task prerequisites. Inspect the current layout after the sidebar extraction.

PageHeader:
- Create a standalone presentational component.
- Accept a required title input and an optional subtitle input.
- Render the title as an h1.
- Render the subtitle only when it contains nonblank text.
- Keep router dependencies out of this component.
- Reuse existing theme, typography, spacing, and border tokens.
- Follow BEM and mobile-first conventions.

AppLayout:
- Read pageTitle and pageSubtitle from the active primary child route's data.
- Resolve the active route on initial load and after successful navigation, including lazy-loaded and nested routes.
- Update the header when navigating between Products and My Profile.
- Follow existing reactive and subscription-cleanup conventions.
- Hide the header if the active route provides no valid title.

Structure:
- Preserve AppSidebar and its logout event handling.
- Inside the main area, place PageHeader above a content wrapper containing the router-outlet.
- The header spans the main content area's width, alongside the sidebar.
- Keep the header in normal document flow; do not add sticky or fixed positioning.
- Remove duplicate page headings from Products and MyProfile so each page has one h1.
- Preserve the existing route metadata values, guards, and navigation behavior.

Do not add product views, API calls, or backend changes.

Add focused tests for initial metadata, title updates on navigation, and an absent subtitle. Update affected existing tests, run the relevant tests and Angular build, and report results.
