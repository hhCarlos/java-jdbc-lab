# Latest task prompt

Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-19T18:58:51-06:00

## Task prompt

Update the existing product-creation form's submit and Cancel behavior.

Follow AGENTS.md and all applicable task prerequisites. Reuse AppButton and AppModal.

Create product button:
- Disable it while the form is invalid or validation is pending.
- Also disable it during submission if a submission state already exists.
- Preserve validation inside submit() so disabling the button is not the only safeguard.
- Ensure AppButton applies disabled to the native button.
- Add or reuse a BEM disabled modifier with neutral gray styling, using semantic theme tokens.
- Disabled styling must work across statuses and variants in both themes.
- Disabled buttons must not emit pressed events.

Cancel behavior:
- If the form is pristine, navigate directly to /app/products.
- If the form is dirty, open the shared confirmation modal.
- Title: "Leave this page?"
- Message: "Are you sure you want to leave? Your unsaved changes will be permanently lost."
- Provide two shared buttons:
  - "Keep editing": dismiss the modal and preserve all form values.
  - "Leave without saving": dismiss the modal and navigate to /app/products.
- Use the existing error status for the destructive confirmation.
- Escape and the modal's close button must behave like "Keep editing".
- Give "Keep editing" initial focus.
- Confirmation buttons must use type="button" and must not submit the product form.

Keep this confirmation scoped to the Cancel action. Do not add route-deactivation guards, browser-unload warnings, persistence, or backend changes.

Add focused tests for disabled submission, pristine cancellation, dirty-form confirmation, preserving edits on dismissal, and confirmed navigation.

Run relevant tests and the Angular build. Report results.
