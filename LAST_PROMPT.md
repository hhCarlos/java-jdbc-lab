# Latest task prompt

Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-18T15:50:55-06:00

## Task prompt

Forget about it it was a mistake, follow this instead Update the existing SVG icon system with a named registry and fallback behavior.

Follow AGENTS.md and all applicable task prerequisites.

Registry and fallback:
- Register the supplied icon under the canonical name "not-found".
- Support "default" as an alias pointing to the same symbol, without duplicating its SVG geometry.
- Maintain one central typed registry mapping supported names to sprite symbol IDs.
- Resolve icon names through this registry rather than constructing arbitrary sprite references from user input.
- Missing, null, undefined, blank, or unknown names must render "not-found".
- Document name as the expected input, but allow absence at runtime. Do not use Angular's required-input enforcement, since omitted names must render the fallback.
- Preserve the existing size options and accessibility behavior.
- Remove or update the old empty placeholder so fallback rendering always shows this actual icon.

SVG:
- Add the following symbol to the existing sprite.
- Preserve its viewBox, path geometry, fill="none", and stroke attributes.
- Use stroke="currentColor".
- Do not retain SVGRepo wrapper groups or carrier IDs.

<symbol id="not-found" viewBox="0 0 24 24" fill="none">
  <path
    d="M14.2647 15.9377L12.5473 14.2346C11.758 13.4519 11.3633 13.0605 10.9089 12.9137C10.5092 12.7845 10.079 12.7845 9.67922 12.9137C9.22485 13.0605 8.83017 13.4519 8.04082 14.2346L4.04193 18.2622M14.2647 15.9377L14.606 15.5991C15.412 14.7999 15.8149 14.4003 16.2773 14.2545C16.6839 14.1262 17.1208 14.1312 17.5244 14.2688C17.9832 14.4253 18.3769 14.834 19.1642 15.6515L20 16.5001M14.2647 15.9377L18.22 19.9628M12 4H7.2C6.07989 4 5.51984 4 5.09202 4.21799C4.7157 4.40973 4.40973 4.71569 4.21799 5.09202C4 5.51984 4 6.0799 4 7.2V16.8C4 17.4466 4 17.9066 4.04193 18.2622M4.04193 18.2622C4.07264 18.5226 4.12583 18.7271 4.21799 18.908C4.40973 19.2843 4.7157 19.5903 5.09202 19.782C5.51984 20 6.07989 20 7.2 20H16.8C17.9201 20 18.4802 20 18.908 19.782C19.2843 19.5903 19.5903 19.2843 19.782 18.908C20 18.4802 20 17.9201 20 16.8V12M16 3L18.5 5.5M18.5 5.5L21 8M18.5 5.5L21 3M18.5 5.5L16 8"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</symbol>

Add focused tests for canonical names, the default alias, missing/blank names, and unknown names. Verify the Angular build and demonstrate inherited color.

Do not add dependencies or modify existing page UI. Report results and document how to register the next icon.
