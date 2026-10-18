Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-17T18:31:33-06:00

## Task prompt

Add a live password-requirements checklist to the existing registration form.

Follow AGENTS.md and all applicable task prerequisites.

Behavior:
- Show a small inline panel below the password field while it has focus.
- Update these requirements as the user types:
  - At least one lowercase letter.
  - At least one uppercase letter.
  - At least one number.
  - At least one special character, excluding whitespace.
- Each requirement must have a circular bullet:
  - Unsatisfied: red.
  - Satisfied: bright neon green.
- Keep the requirement text in the normal readable text color.
- Include a checkmark for satisfied requirements and accessible satisfied/unsatisfied text so state is not communicated by color alone.
- Hide the panel when the password field loses focus, preserving existing validation errors.
- Reuse the form's password-validation logic and preserve the password exactly as entered.

Semantic color tokens:
- Add or reuse global status tokens for success and error in the existing theme system.
- Use HSL notation.
- Suggested dark-theme indicator colors:
  - Success: hsl(110 100% 55%).
  - Error: hsl(0 90% 60%).
- Provide corresponding light-theme colors with sufficient contrast against the light surface, preserving the vivid green and red direction.
- Keep indicator colors separate from readable status-text colors where necessary.
- Use these semantic tokens in the checklist; do not hardcode colors in component styles or alter the brand-red token.

Keep all UI text in English. Follow existing BEM and mobile-first conventions, associate the checklist with the input, and keep it in normal document flow.

Do not add dependencies, API integration, or password-strength scoring.

Verify the build and the checklist's behavior in both themes. Report the changes and verification results.
