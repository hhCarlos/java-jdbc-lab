# Global styles

`../styles.scss` is the only global entry point. Sass modules load through
`@use`; abstracts expose reusable definitions through `@forward`.

- `abstracts/`: shared CSS token mixin (emits no CSS until included).
- `base/`: minimal reset, typography, and document defaults.
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
