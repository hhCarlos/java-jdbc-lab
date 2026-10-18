Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-18T17:35:31-06:00

Task prompt:

Create a reusable standalone AppButton component in the frontend shared component structure, following the supplied wireframe.

Follow AGENTS.md and all applicable task prerequisites.

Public API:
- label: required button text.
- icon: optional icon name, rendered through the existing AppIcon component.
- iconPosition: "left" | "right" | "top" | "bottom", defaulting to "left".
- disabled: boolean, default false.
- type: "button" | "submit" | "reset", defaulting to "button".
- pressed: an output emitting the native activation event. The consuming component handles the action.

Behavior:
- Use a real HTML button with native keyboard and form behavior.
- Support text-only buttons. When no icon is provided, do not render AppIcon or its fallback.
- Place the icon before, after, above, or below the label according to iconPosition.
- Disabled buttons must not emit pressed.
- Do not prevent normal form submission for submit buttons.
- Keep icons decorative because the visible label supplies the accessible name.

Styling:
- Use the existing brand red and semantic theme tokens for readable foreground, hover, focus, and disabled states.
- Reuse existing spacing, border-radius, and typography tokens.
- Icons inherit the button's text color.
- Support light and dark themes, BEM naming, and mobile-first styling.
- Keep the component minimal; do not introduce variants, extra size options, dependencies, or business logic.

Do not replace existing buttons yet.

Add focused tests for text-only rendering, all icon positions, event emission, and disabled behavior. Run the relevant tests and Angular build.

Document examples such as:
<app-button label="Save" icon="products" (pressed)="save()" />
<app-button label="Continue" icon="profile" iconPosition="right" />
<app-button label="Create account" type="submit" />
