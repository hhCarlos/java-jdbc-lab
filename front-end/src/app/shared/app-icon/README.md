# AppIcon

Import `AppIcon` from `./app-icon` (adjust the path for the consuming component)
and add it to the standalone component's `imports` array.

```html
<span style="color: var(--color-primary)">
  <app-icon name="not-found" size="xl" />
  Example text
</span>
```

`name` is the expected input. Supported names are `products`, `profile`, `logout`, `edit`, `success`, `error`, `warning`, `loader`, `not-found`, and `default`
(an alias for `not-found`). Omitted, null, undefined, blank, and unknown names
render `not-found`. Names are matched exactly through `ICON_REGISTRY`; arbitrary
input cannot select an unregistered sprite symbol.

Color inherits from surrounding text through `color: inherit` and the symbol's
`fill="currentColor"` or `stroke="currentColor"`. For example, these render the same icon in two colors
without changing the sprite or existing page UI:

```html
<span style="color: #c62828"><app-icon name="not-found" /></span>
<span style="color: #1565c0"><app-icon name="default" /></span>
```
The new icons preserve their original viewBoxes and artwork transforms:

| Name | ViewBox | Paint |
| --- | --- | --- |
| `products` | `0 0 20 20` | Fill |
| `profile` | `0 0 30.586 30.586` | Fill |
| `logout` | `0 0 24 24` | Stroke |
| `edit` | `0 0 24 24` | Stroke |
| `success` | `0 0 36 36` | Fill |
| `error` | `0 0 64 64` | Fill (even-odd) |
| `warning` | `0 0 64 64` | Fill |
| `loader` | `0 0 24 24` | Stroke |

```html
<app-icon name="products" />
<app-icon name="profile" size="xl" label="Profile" />
<app-icon name="logout" size="sm" label="Log out" />
<app-icon name="edit" label="Edit" />
<app-icon name="success" label="Success" />
<app-icon name="error" label="Error" />
<app-icon name="warning" label="Warning" />
<app-icon name="loader" label="Loading" />
```

Sizes use global tokens in `src/styles/abstracts/_tokens.scss`:

| Size | Token | Value |
| --- | --- | --- |
| `sm` | `--icon-size-sm` | `1rem` |
| `md` (default) | `--icon-size-md` | `1.25rem` |
| `xl` | `--icon-size-xl` | `1.5rem` |
| `xll` | `--icon-size-xll` | `2rem` |

Icons are decorative and hidden from assistive technology by default. For a
meaningful standalone icon, provide `label="Meaningful description"`; the SVG
then exposes an image role and accessible name. Empty or whitespace-only labels
remain decorative. Icons are not focusable or interactive. Put interactions on
buttons or links and give those controls an accessible name; keep their icons
decorative when text or the control's own label already supplies that name.

## Add an icon

1. Add a `<symbol id="icon-name" viewBox="0 0 24 24">` to
   `public/icons/sprite.svg`, using the artwork's actual viewBox if different.
   Paste only its SVG shapes inside the symbol, without a nested root `<svg>`.
2. Use `currentColor` for monochrome fills or strokes on the appropriate symbol,
   group, or shapes. Preserve `fill="none"`, `stroke="none"`, stroke widths,
   line caps, line joins, fill rules, and other geometry attributes as needed.
   Do not apply both fill and stroke indiscriminately. The component leaves
   those painting decisions to the symbol.
3. Add a name-to-symbol entry to `ICON_REGISTRY` in `icon-registry.ts`, for
   example `search: 'search'`. `IconName` is derived from this central registry.
   For an alias, map another name to the same ID; do not duplicate geometry.
4. Use `<app-icon name="search" />`. Extend the focused component tests for
   any new behavior, then run `npm test -- --watch=false` and `npm run build`
   from `front-end/`.

The component references `icons/sprite.svg#<registered-symbol-id>` relative to the application's
base URL. Angular copies `public/` into the build output; no sprite registration
or dependency is needed.
