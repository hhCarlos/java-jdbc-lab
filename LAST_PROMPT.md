# Latest task prompt

Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-17T19:25:22-06:00

## Task prompt

Integrate the existing global blocking loader into registration.

Follow AGENTS.md and all applicable task prerequisites.

Requirements:
- Reuse the existing loader component and service.
- Show the loader immediately before submitting a valid registration request.
- Do not show it when form validation fails.
- Keep duplicate-submit prevention in place.
- Always release the loader when the request succeeds, fails, or is cancelled, including when the component is destroyed.
- Use RxJS finalize and subscription cleanup consistent with the existing implementation.
- If the loader service returns a request-specific handle, release only that handle.
- Preserve existing success feedback, error handling, form validation, and password behavior.
- Ensure registration can be retried after a failed request.
- Do not introduce artificial delays to make the loader visible.
- Keep this behavior scoped to registration; do not add a global HTTP interceptor.

Add focused tests verifying that the loader activates during a pending request, is released on success/error/cancellation, and does not activate for an invalid form.

Run the relevant tests and Angular build. Report the results and provide manual verification steps using browser network throttling.
