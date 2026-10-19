Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-18T19:10:24-06:00

Task prompt:

Create a reusable standalone AppInput component and use it to simplify the product-creation form.

Follow AGENTS.md and all applicable task prerequisites. Inspect the existing form controls, validators, error messages, and styling first.

Component API:
- Required label and inputId.
- type: text, email, password, or number; default text.
- Optional inputMode, placeholder, autocomplete, hint, and pattern.
- Optional minLength/maxLength for text.
- Optional min/max/step for numbers.
- Optional showCounter, default false.
- Optional custom error-message mapping for application-specific validation errors.

Angular forms integration:
- Implement ControlValueAccessor so the component works with formControlName.
- Correctly propagate values, touched state, and disabled state.
- Programmatic value updates must not emit user-change callbacks.
- Preserve text values exactly; do not trim, filter characters, or silently round numbers.
- In number mode, handle empty values without emitting NaN.
- Generic validation inputs must participate in Angular form validation, including when their configuration changes. Native HTML attributes alone are insufficient for a custom form control.
- Preserve existing parent-control validators and business rules.
- Treat pattern as validation, not keystroke filtering.
- Keep backend validation authoritative.

Rendering:
- Centralize the label, native input, hint, counter, and validation feedback.
- Display errors when the control is invalid and touched or the parent form has been submitted.
- Support the existing product form's custom validation errors with readable English messages.
- Associate labels, hints, counters, and errors accessibly.
- Preserve focus-first-invalid behavior by targeting the actual native input.
- Reuse theme tokens, semantic status colors, typography, BEM, and mobile-first styling.

Migration:
- Replace only the product form's title, price, and stock fields with AppInput.
- Keep price and stock in their existing text-based representation and input modes.
- Preserve all current validation, submission, and Cancel behavior.
- Leave the description textarea, login, registration, and password checklist unchanged.
- Remove obsolete duplicated field markup and styles.

Do not add dependencies, API integration, or backend changes.

Add focused tests for form integration, touched/disabled behavior, validation inputs, error visibility, and the optional counter. Update affected product-form tests.

Run relevant tests and the Angular build. Report results and show the simplified product-form template.
