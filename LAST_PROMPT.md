Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-17T18:04:54-06:00

## Task prompt

Set up the global styling foundation for the Angular application in front-end/.

Follow AGENTS.md and all applicable task prerequisites. Keep this task limited to frontend styles.

Use SCSS with a 7–1 structure under src/styles/:
- abstracts/
- base/
- components/
- layout/
- pages/
- themes/
- vendors/

Keep src/styles.scss as the single global entry point. Use Sass @use and @forward rather than deprecated @import. Keep unused categories minimal; do not invent components or page styles.

Create a design-token foundation for:
- Semantic colors.
- Typography.
- Spacing.
- Border radii.
- Shadows.
- Z-index layers.

Use CSS custom properties for runtime theme values and HSL color notation.

Visual direction:
- Restrained, readable, editorial style.
- Primary red inspired by O’Reilly: hsl(0 100% 41%).
- Light background: hsl(40 25% 96%).
- Light surface: hsl(40 20% 99%).
- Light text: hsl(225 15% 14%).
- Dark background: hsl(225 15% 9%).
- Dark surface: hsl(225 12% 13%).
- Dark text: hsl(40 20% 93%).
- Preserve the same primary red in both themes.
- Choose complementary muted text, borders, and interaction colors with readable contrast. Do not assume primary red is suitable for small text on every background.

Theme implementation:
- Separate light and dark theme files.
- Light is the default.
- Support explicit selection through data-theme="light" or data-theme="dark" on the html element.
- Components should eventually consume semantic tokens rather than hardcoded palette colors.

Add a minimal global reset, border-box sizing, inherited form-control typography, and base body styles. Use system fonts without external font downloads.

Do not add pages, sample components, a theme-switching UI, UI frameworks, backend changes, or Docker changes.

Verify that the Angular build succeeds. Report the structure, selected palette, and how to manually select either theme.
