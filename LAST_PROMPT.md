Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-17T18:21:22-06:00

## Task prompt

Implement the registration form inside the existing Register component.

Follow AGENTS.md and all applicable task prerequisites.

Use Angular reactive forms with these required fields:
- name: label "First name".
- lastname: label "Last name".
- email: label "Email".
- password: label "Password".

Validation:
- First name and last name must not be blank or contain only whitespace.
- Both names must have a maximum length of 50 characters. Support accented names, spaces, apostrophes, and hyphens.
- Email must pass Angular's email validator.
- Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character. Do not count whitespace as a special character.
- Do not trim or otherwise modify the password.
- Do not invent additional password length requirements in this phase.

UI:
- All labels, instructions, buttons, and validation messages must be in English.
- Explain password requirements before submission.
- Show field errors after the field is touched or submission is attempted.
- On invalid submission, mark fields as touched and focus the first invalid field.
- Use accessible labels, appropriate autocomplete attributes, and associated error messages.
- Add a "Create account" submit button.
- Add an "Already have an account? Sign in" link to /auth/login.
- Reuse the existing layout, theme tokens, and BEM/mobile-first styling.

Keep the form local for now. A valid submission must not send a request, simulate successful registration, or log the password.

Do not add API services, change the backend, or implement the login form.

Verify the build and add focused validation tests, especially for whitespace-only names and each password requirement. Report the results.
