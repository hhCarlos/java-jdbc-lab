Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-20T19:20:49-06:00

Task prompt:

Verify and complete publication-intent handling in ProductForm edit mode.

Follow AGENTS.md and all applicable task prerequisites.

Reuse the existing suspended checkbox; do not add another field.

Requirements:
- Restocking must enable the checkbox without automatically unchecking it.
- With positive stock and suspension checked, submit active=false.
- With positive stock and suspension unchecked, submit active=true.
- With zero stock, keep suspension checked and disabled, and submit active=false.
- Include the explicit active value in every edit request, even when the suspension control is disabled.
- Preserve the user's selection while editing other fields.
- Count an explicit suspension change toward edit submission eligibility.
- Preserve existing validation, loading, notifications, and Cancel confirmation.
- Keep create mode unchanged.

Inspect the existing implementation first and change only what is missing.

Test both restocking scenarios, zero-stock behavior, and a status-only edit with positive stock. Run relevant frontend tests and the Angular build, then report results.
