Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-20T19:09:11-06:00

Task prompt:

Add a publication-control field to the existing ProductForm edit flow.

Follow AGENTS.md and all applicable task prerequisites. Limit application changes to front-end/.

UI:
- Show the field only in edit mode after product loading succeeds.
- Make it span the full available form width, including across grid columns.
- Use a contrasting information panel with a subtle blue background and border.
- Include a native checkbox, an information AppIcon, and these English texts:
  - Title: "Suspend Product"
  - Subtitle: "Suspend this product to hide it from the public catalog."
- Associate the checkbox accessibly with its label and description.
- Use BEM, existing spacing tokens, and responsive styling.

Information styling:
- Reuse existing information-status tokens and icon if available.
- Otherwise, add an information icon to the existing sprite/registry and semantic information tokens.
- Use hsl(212 60% 48%) as the base blue direction, adjusting theme-specific colors for contrast.
- Keep text readable using normal theme text colors; color the icon with the information token.
- Preserve AppIcon's inherited-color behavior.

Form and API:
- Add a boolean suspended control.
- Initialize it from the loaded product status: INACTIVE means checked; ACTIVE means unchecked.
- Initial population must leave the form pristine.
- Map suspended to active: !suspended in the PUT request.
- Extend the typed update request accordingly, without adding this field to POST creation.
- Toggling the checkbox must participate in dirty tracking, submission eligibility, and Cancel confirmation.
- Preserve validation, loader behavior, notifications, and create/update/delete flows.
- Explain that zero-stock products remain inactive even when suspension is unchecked.
- Use the backend response as the authoritative resulting status.

Do not add backend changes, dependencies, or another shared form-control component.

Test initialization, checkbox-to-payload mapping, dirty tracking, and create-mode isolation. Run relevant frontend tests and the Angular build, then report results.
