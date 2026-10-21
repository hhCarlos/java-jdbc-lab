Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-20T19:43:58-06:00

Task prompt:

Add a Save as draft action to ProductForm in create mode only.

Follow AGENTS.md and all applicable task prerequisites. Limit application changes to front-end/.

Button:
- Reuse AppButton with label="Save as draft", variant="ghost", status="warning", and type="button".
- Place it alongside the existing creation actions.
- Keep it visible but disabled unless the form is valid, stock is a valid positive integer, validation is complete, and no write request is pending.
- Hide it in edit mode.
- Enforce the same conditions in its handler, not only through the disabled button.

Submission:
- Reuse the existing creation flow and ProductsService.create().
- Send active=false explicitly to save the product as INACTIVE.
- Preserve entered values and existing numeric validation.
- Reuse the blocking loader, duplicate-submit prevention, subscription cleanup, and finalize handling.
- Prevent simultaneous submissions through the normal creation and draft buttons.

Success:
- Show the existing success notification: "Product saved as draft."
- Mark the form pristine and navigate to Products with fresh-list retrieval.

Failure:
- Preserve form values and stay on the form.
- Show an error notification: "Unable to save the product as a draft. Please try again."
- Preserve authentication-expiry handling.

Keep normal creation, editing, deletion, and Cancel confirmation unchanged. Normal creation with zero stock remains allowed under existing rules.

Test button eligibility, explicit active=false, handler safeguards, duplicate prevention, success/error behavior, and edit-mode exclusion.

Run relevant frontend tests and the Angular build. Report results and changed files.
