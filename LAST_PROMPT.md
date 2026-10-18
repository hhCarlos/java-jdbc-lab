Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-17T18:09:28-06:00

## Task prompt

Extend the existing SCSS foundation with reusable utilities and a mobile-first breakpoint mixin.

Follow AGENTS.md and all applicable task prerequisites. Inspect the existing style tokens and 7–1 structure before changing anything.

Utilities:
- Generate margin and padding utilities, including individual sides and horizontal/vertical axes.
- Generate gap, row-gap, and column-gap utilities.
- Generate a small set of shadow and border-radius utilities.
- Add a visually-hidden utility that preserves accessibility.
- Reuse existing spacing, shadow, and radius tokens through CSS custom properties.
- Keep class names consistent and document them.
- Keep the generated CSS bounded: no negative spacing scale, responsive class combinations, or large utility framework.
- Fit these utilities into the existing 7–1 structure.

Responsive mixin:
- Implement respond($breakpoint) using a Sass map.
- Use these mobile-first min-width breakpoints:
  - sm: 40em
  - md: 48em
  - lg: 64em
  - xl: 80em
- Emit a clear Sass compilation error for an unknown breakpoint.
- Export the mixin through the abstracts entry point.
- Keep abstracts free of emitted CSS so importing them in component styles does not duplicate global styles.

Expected usage after the appropriate Sass import:

.card {
  padding: var(--existing-spacing-token);

  @include respond(md) {
    // Tablet and larger.
  }

  @include respond(lg) {
    // Desktop and larger.
  }
}

Replace the illustrative token above with an actual existing token in documentation examples.

Do not add pages, components, dependencies, backend changes, or Docker changes.

Verify that the Angular build succeeds. Report utility names and provide working examples of importing and using respond(md) from an Angular component stylesheet.
