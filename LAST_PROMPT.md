Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-18T15:40:44-06:00

## Task prompt

Prepare a minimal reusable SVG icon system in front-end/.

Follow AGENTS.md and all applicable task prerequisites.

Sprite:
- Create public/icons/sprite.svg.
- Include one empty symbol named "placeholder" with viewBox="0 0 24 24".
- Add a comment indicating where the first icon's SVG paths should be pasted.
- Use symbol IDs as icon names.
- Monochrome icon fills or strokes must use currentColor. Preserve fill="none", stroke="none", and other geometry attributes where appropriate; do not force both fill and stroke onto every shape.

Component:
- Create a standalone AppIcon component in the existing shared component structure.
- Render icons using SVG use references to the local sprite.
- Provide a typed name input, initially supporting "placeholder".
- Provide exactly these size options:
  - sm: 1rem
  - md: 1.25rem, default
  - xl: 1.5rem
  - xll: 2rem
- Define reusable icon-size tokens in the existing styling foundation.
- Inherit color from the surrounding text.
- Keep icons decorative and hidden from assistive technology by default.
- Support an optional accessible label for meaningful standalone icons.
- Do not make the icon itself interactive; buttons and links provide interaction.

Document how to add a symbol, update the supported names, and use the component with a size and inherited color.

Do not add dependencies, actual icon artwork, or modify existing page/sidebar UI.

Verify the Angular build and report changed files with a minimal usage example.
