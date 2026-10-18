# Latest task prompt

Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-17T19:18:56-06:00

## Task prompt

Implement a reusable fullscreen blocking loader and global z-index utilities in front-end/.

Follow AGENTS.md and all applicable task prerequisites.

Phase 1 only: infrastructure. Do not connect the loader to registration or HTTP requests yet.

Z-index foundation:
- Inspect and reuse the existing z-index tokens.
- Define a documented layer scale for base content, dropdowns, sticky elements, backdrops, modals, notifications, and the blocking loader.
- The blocking loader must be the highest application layer.
- Generate matching u-z-* utility classes using the existing SCSS structure.
- Consume tokens instead of scattering numeric z-index values across components.

Global loader:
- Create a reusable standalone component and a small service to control its visibility.
- Mount it once at the application root, outside routed layouts.
- Keep it hidden by default.
- When active, cover the entire viewport with a themed backdrop, a spinner, and the English message "Please wait…".
- Block pointer and keyboard interaction with the underlying application.
- Prevent background scrolling while active and restore previous behavior when hidden.
- Manage focus accessibly, restoring it to the previous element when appropriate.
- Announce loading status to assistive technology and mark the relevant application content as busy.
- Respect reduced-motion preferences.
- Ensure hiding or destroying the loader releases any interaction and scrolling restrictions.
- Avoid stacking contexts that would trap the overlay beneath routed content.

Styling:
- Reuse existing color, spacing, and typography tokens.
- Support light and dark themes.
- Follow BEM and mobile-first conventions.
- Use CSS for the spinner without adding dependencies.

Keep the public control API small and document how a component can show and hide the loader, including cleanup after errors.

Do not change registration, login, API services, backend code, or Docker configuration. Do not add artificial delays or a permanent demo button.

Verify the Angular build and manually check visibility, layering, keyboard blocking, scrolling restoration, and both themes. Report what was verified and anything left unverified.
