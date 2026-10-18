# AppIcon

Import `AppIcon` from `./app-icon` (adjust the path for the consuming component)
and add it to the standalone component's `imports` array.

```html
<span style="color: var(--color-primary)">
  <app-icon name="placeholder" size="xl" />
  Example text
</span>
```

Color inherits from surrounding text. The empty placeholder renders no artwork.
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
   The symbol ID is the icon name. The comment inside `placeholder` marks where
   the first icon's paths can be pasted instead.
2. Use `currentColor` for monochrome fills or strokes on the appropriate symbol,
   group, or shapes. Preserve `fill="none"`, `stroke="none"`, stroke widths,
   line caps, line joins, fill rules, and other geometry attributes as needed.
   Do not apply both fill and stroke indiscriminately. The component leaves
   those painting decisions to the symbol.
3. Add the exact symbol ID to the `IconName` union in `app-icon.ts`, then use it
   as the `name` input. Keep the union synchronized if you rename a symbol.

The component references `icons/sprite.svg#<name>` relative to the application's
base URL. Angular copies `public/` into the build output; no sprite registration
or dependency is needed.
