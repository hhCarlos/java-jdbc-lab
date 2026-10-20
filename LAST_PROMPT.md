# Latest task prompt

Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-19T21:36:28-06:00

## Task prompt

Integrate the existing AppLayout notifications into product creation and editing.

Follow AGENTS.md and all applicable task prerequisites. Reuse the notification service's actual API.

- After successful creation, show a success notification:
  "Product created successfully."
- After successful update, show a success notification:
  "Product updated successfully."
- Preserve navigation to Products and fresh-list retrieval. The notification must remain visible after navigation.
- On creation failure, show an error notification:
  "Unable to create the product. Please try again."
- On update failure, show an error notification:
  "Unable to update the product. Please try again."
- On failure, preserve form values and remain on the form, except when existing authentication handling requires redirecting.
- Do not show success before the backend confirms the operation.
- Preserve the existing blocking loader, cleanup, validation, and duplicate-submit prevention.
- Replace the temporary generic console failure messages with these notifications.
- Trigger notifications from the form component, not the HTTP service or interceptor.

Keep changes limited to these two operations. Do not add warning or loader notifications yet.

Update affected tests, run relevant frontend tests and the Angular build, and report results.
