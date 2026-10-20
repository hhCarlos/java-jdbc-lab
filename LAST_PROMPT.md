Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-19T21:33:46-06:00

Task prompt:

Refactor only the organization inside the existing app-layout directory.

Follow AGENTS.md and all applicable task prerequisites.

Requirements:
- Keep AppLayout's own component files at the app-layout root so its lazy-loaded route path remains stable.
- Group layout-owned child components under components/<component-name>/, keeping each component's TypeScript, template, styles, and tests together.
- Group existing layout-scoped services under services/.
- Add a models/ directory only if existing standalone model files need a home.
- Inspect actual files before moving them; do not create empty folders or move components from elsewhere into this scope.
- Update affected imports, test references, and documentation paths.
- Preserve component selectors, public APIs, service-provider scopes, notification state, navigation, and styling.
- Account for relative Sass imports after moving files.

This is a structural refactor only. Do not integrate product notifications, change behavior, add abstractions or dependencies, or reorganize other features.

Run affected tests and the Angular build. Report moved files, the resulting directory tree, and
