Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-20T19:15:14-06:00

Task prompt:

Fix the Suspend Product control in the frontend product-edit form.

Follow AGENTS.md and all applicable task prerequisites.

Behavior:
- When stock is zero, show Suspend Product checked and disabled.
- Explain: "Add stock before reactivating this product."
- When stock becomes a valid positive integer, enable the checkbox, provided no request is pending.
- Do not automatically uncheck it when stock increases; reactivation requires an explicit user choice.
- Keep it disabled while stock is empty or invalid.
- If stock changes from positive to zero, check and disable suspension immediately.

Implementation:
- Manage disabled state through the existing reactive form control.
- Preserve the suspension value when building the PUT payload; disabled controls are omitted from form.value, so use an appropriate approach such as getRawValue().
- With zero stock, send active=false.
- Initial loading and derived control-state updates must not make an untouched form dirty.
- Avoid recursive value-change subscriptions.
- Preserve existing submission, loading, notifications, and cancellation behavior.

Do not modify the backend or create flow.

Test initial zero stock, positive-to-zero changes, re-enabling after restocking, explicit reactivation, pristine initialization, and the submitted payload.

Run relevant frontend tests and the Angular build. Report results.
