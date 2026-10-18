Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-18T14:41:50-06:00

Task prompt:

Connect the existing login form to authentication and add a bearer-token HTTP interceptor.

Follow AGENTS.md and all applicable task prerequisites. Reuse the existing AuthService, session service, and global loader.

Login form:
- Submit email and password only when the form is valid.
- Preserve the password exactly as entered.
- Prevent duplicate submissions and show the existing blocking loader while the request is pending.
- On success, establish the session using the existing session-service API, clear the password, and navigate to /app/products.
- Handle invalid credentials, connection failures, and unexpected errors with accessible English messages.
- Keep the user on the login page when authentication fails.
- Always release the loader and reset submission state on success, error, or cancellation. Use finalize and the existing subscription-cleanup conventions.
- Preserve the current validation, layout, and styling.

HTTP interceptor:
- Implement a functional Angular interceptor and register it through the existing HttpClient configuration.
- Obtain the current usable token from the session service.
- Attach Authorization: Bearer <token> only to requests targeting this application's API.
- Match API paths precisely; do not attach credentials to external URLs.
- Exclude login and registration requests.
- Leave requests unchanged when there is no usable token.
- Preserve existing headers and interceptor configuration.
- Never log tokens or credentials.

Do not add route guards, logout UI, automatic redirects on API errors, refresh tokens, persistent storage, or backend changes.

Add focused tests covering:
- Successful login establishes the session and navigates.
- Invalid forms do not submit.
- Authentication errors preserve the page and display feedback.
- Duplicate submissions are prevented.
- Loader cleanup occurs on success, error, and cancellation.
- The interceptor attaches the token to eligible API requests and excludes authentication requests, external URLs, and requests without a usable token.

Run the relevant tests and Angular build. Report results and manual verification steps.
