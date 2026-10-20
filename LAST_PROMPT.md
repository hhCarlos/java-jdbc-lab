# Latest task prompt

Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-19T18:42:33-06:00

## Task prompt

This is /front-end only. Extend the existing shared AppButton with semantic statuses and a ghost variant.

Follow AGENTS.md and all applicable task prerequisites. Inspect the current component and semantic theme tokens first.

Public API:
- status: "default" | "success" | "error" | "warning", default "default".
- variant: "solid" | "ghost", default "solid".
- Preserve all existing inputs, outputs, icon positions, native button behavior, and accessibility.

Appearance:
- Keep the current brand-red appearance for default solid buttons.
- Use semantic status tokens for success, error, and warning.
- Ghost buttons have a transparent background, with text and border using the selected status color.
- Icons inherit the text color.
- Provide consistent hover, active, focus-visible, and disabled styles.
- Ensure readable text and visible borders in both light and dark themes. Do not assume white text works on bright success or warning backgrounds.
- Add missing semantic tokens to the existing theme system rather than hardcoding colors in component styles.
- Keep disabled behavior independent of status and variant.
- Follow existing BEM conventions.

Statuses are visual intent; they must not automatically trigger actions, loading, or success/error messages.

Do not replace existing form buttons or modify product-form behavior in this task.

Run affected existing tests and the Angular build. Verify all status/variant combinations in both themes, and report what was actually checked.

Document examples:
<app-button label="Save" status="success" />
<app-button label="Delete" status="error" variant="ghost" />
<app-button label="Review" status="warning" variant="ghost" />
