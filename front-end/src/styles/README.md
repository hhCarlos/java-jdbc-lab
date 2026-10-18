# Global styles

`../styles.scss` is the only global entry point. Sass modules load through
`@use`; abstracts expose reusable definitions through `@forward`.

- `abstracts/`: shared CSS token mixin and breakpoints (no top-level CSS).
- `base/`: minimal reset, typography, document defaults, and utilities.
- `themes/`: light defaults and explicit dark overrides.
- `components/`, `layout/`, `pages/`, `vendors/`: reserved, empty categories.

Use semantic custom properties in future component styles, such as
`color: var(--color-text)` and `background: var(--color-surface)`.
`--color-primary` remains the same red in both themes; use `--color-link`
for small interactive text and `--color-on-primary` for text on primary fills.
`--color-border` is a subtle divider; use `--color-border-strong` when an
interactive control needs a visible boundary.

Light is the default, independent of operating system preferences. Select a
theme on the document element:

```html
<html lang="en" data-theme="light">
<html lang="en" data-theme="dark">
```

Or change it at runtime in the browser console:

```js
document.documentElement.dataset.theme = 'dark';
document.documentElement.dataset.theme = 'light';
```

Removing `data-theme` restores light. No theme persistence or switch UI is included.

## Utilities

Utilities load once from the global entry point, after base styles. They use
normal specificity without `!important`; component styles can override them.
Spacing steps are exactly `0`, `1`, `2`, `3`, `4`, `6`, `8`, `12`, `16`,
referencing the matching `--space-*` custom properties.

| Class pattern | Effect |
| --- | --- |
| `u-m-{step}`, `u-p-{step}` | Margin or padding on all sides |
| `u-mt-{step}`, `u-pt-{step}` | Top |
| `u-mr-{step}`, `u-pr-{step}` | Right |
| `u-mb-{step}`, `u-pb-{step}` | Bottom |
| `u-ml-{step}`, `u-pl-{step}` | Left |
| `u-mx-{step}`, `u-px-{step}` | Left and right |
| `u-my-{step}`, `u-py-{step}` | Top and bottom |
| `u-gap-{step}` | Gap on both axes |
| `u-row-gap-{step}`, `u-column-gap-{step}` | Gap on one axis |
| `u-shadow-{none,sm,md,lg}` | Matching `--shadow-*` token |
| `u-radius-{none,sm,md,lg,full}` | Matching `--radius-*` token |
| `u-visually-hidden` | Visually hide text while retaining screen-reader access |

Examples: `class="u-p-4 u-mb-6 u-radius-sm u-shadow-sm"` or
`class="u-px-4 u-py-2"`. Gap utilities require a layout that supports gap,
such as grid or flex. There are 170 utility classes, no negative spacing
variants, and no responsive variants. The visually hidden utility's `-1px`
margin is a clipping technique, not a spacing-scale value. Use it for text
such as control labels, not focusable controls that would become invisible.

## Mobile-first breakpoints

`respond($breakpoint)` emits a `min-width` media query: `sm: 40em`,
`md: 48em`, `lg: 64em`, `xl: 80em`. Unknown names fail compilation with
the valid names in the error. Base declarations apply at every width.

From `src/app/app.scss`, import the CSS-free abstracts entry point:

```scss
@use '../styles/abstracts' as *;

.card {
  padding: var(--space-4);

  @include respond(md) {
    padding: var(--space-6);
  }

  @include respond(lg) {
    padding: var(--space-8);
  }
}
```

For `src/app/shared/card/card.scss`, the relative import is
`@use '../../../styles/abstracts' as styles;`, then use
`@include styles.respond(md) { padding: var(--space-6); }` inside a selector.
Adjust the relative path for other component locations. Importing abstracts
alone emits no global CSS; the application's global entry point supplies
the custom properties.


## Status colors

Use `--color-success-indicator` and `--color-error-indicator` for graphical
status indicators. Dark mode uses neon green `hsl(110 100% 55%)` and red
`hsl(0 90% 60%)`. Light mode uses saturated green `hsl(110 100% 28%)` and
red `hsl(0 90% 43%)` to maintain contrast against the light surface.
`--color-on-success-indicator` supplies the checkmark color.

Use separate `--color-success-text` and `--color-error-text` for readable
status messages. Password checklist labels keep `--color-text`; their
state is conveyed by circular indicator colors, a checkmark, and hidden
satisfied/unsatisfied text. Brand primary colors are independent of status.

## Application layers

Reuse the existing runtime scale. `overlay` means backdrop and `toast` means
notification; their names remain compatible with existing tokens.

| Layer | Token | Utility | Value |
| --- | --- | --- | --- |
| Base content | `--z-base` | `u-z-base` | 0 |
| Dropdown | `--z-dropdown` | `u-z-dropdown` | 100 |
| Sticky | `--z-sticky` | `u-z-sticky` | 200 |
| Backdrop | `--z-overlay` | `u-z-overlay` | 300 |
| Modal | `--z-modal` | `u-z-modal` | 400 |
| Notification | `--z-toast` | `u-z-toast` | 500 |
| Blocking loader | `--z-blocking-loader` | `u-z-blocking-loader` | 600 |

Utilities are generated from `$z-layers` in `abstracts/_tokens.scss`. Use tokens
or utilities instead of component-specific numbers. Utilities require positioned
(or flex/grid) elements for z-index to apply. The blocking loader is the highest
application layer; reserve it for the root loader. The routed content wrapper
creates the base stacking context, containing all routed layers. Keep `html`,
`body`, `app-root`, and loader ancestors free of transforms, filters, containment,
isolation, and positioned z-index that could trap the fixed overlay. Native
browser top-layer elements (such as `showModal()` dialogs) sit above application
z-index; do not introduce them without coordinating with the blocking loader.
