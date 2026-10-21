Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-20T18:45:14-06:00

Task prompt:
Implement product deletion in the existing ProductForm edit flow.

Follow AGENTS.md and all applicable task prerequisites. Limit application changes to front-end/.

Button and confirmation:
- Show "Delete product" only in edit mode after the product loads.
- Use AppButton with status="error" and type="button".
- Allow deletion independently of form validity, but prevent concurrent write requests.
- Open the existing AppModal before deleting.
- Title: "Delete product?"
- Message: "This product will no longer appear in your products or the public catalog. Any unsaved changes will be discarded."
- Provide "Keep product" and "Delete product" buttons.
- Focus "Keep product" initially.
- Escape, closing the modal, or choosing "Keep product" must preserve edits without calling the API or showing a notification.

Confirmed deletion:
- Close the modal, show the existing blocking loader, and call ProductsService.deleteById() using the validated route ID.
- Prevent duplicate submissions.
- Release the loader and pending state on success, failure, or cancellation.

Use the existing AppLayout notification service and app-notification component:
- On confirmed success, publish status="success":
  "Product deleted successfully."
- Mark the form pristine, navigate to /app/products, and fetch a fresh listing. Keep the notification visible across navigation.
- On API failure, publish status="error":
  "Unable to delete the product. Please try again."
- Stay on the form, preserve edits, and allow retry.
- Preserve existing authentication-expiry handling.
- Never show success before the backend confirms deletion or expose raw server errors.

Preserve create, update, and Cancel behavior. Do not change the backend or create another notification system.

Test confirmation, success/error notifications, navigation, duplicate prevention, and loader cleanup. Run relevant frontend tests and the Angular build, then report results.
