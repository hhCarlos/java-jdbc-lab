Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-18T15:56:56-06:00

Task prompt:

Add these three icons to the existing SVG sprite and central icon registry.

Follow AGENTS.md and all applicable task prerequisites.

Register the names:
- products
- profile
- logout

Use the symbols below. Preserve their individual viewBoxes and all meaningful geometry and transforms. Colors must inherit through currentColor.

<symbol id="products" viewBox="0 0 20 20" fill="currentColor">
  <path d="M17 8h1v11H2V8h1V6c0-2.76 2.24-5 5-5 .71 0 1.39.15 2 .42.61-.27 1.29-.42 2-.42 2.76 0 5 2.24 5 5v2zM5 6v2h2V6c0-1.13.39-2.16 1.02-3H8C6.35 3 5 4.35 5 6zm10 2V6c0-1.65-1.35-3-3-3h-.02c.63.84 1.02 1.87 1.02 3v2h2zm-5-4.22C9.39 4.33 9 5.12 9 6v2h2V6c0-.88-.39-1.67-1-2.22z" />
</symbol>

<symbol id="profile" viewBox="0 0 30.586 30.586" fill="currentColor">
  <g transform="translate(-546.269 -195.397)">
    <path d="M572.138,221.245a15.738,15.738,0,0,0-21.065-.253l-1.322-1.5a17.738,17.738,0,0,1,23.741.28Z" />
    <path d="M561.464,204.152a4.96,4.96,0,1,1-4.96,4.96,4.966,4.966,0,0,1,4.96-4.96m0-2a6.96,6.96,0,1,0,6.96,6.96,6.96,6.96,0,0,0-6.96-6.96Z" />
    <path d="M561.562,197.4a13.293,13.293,0,1,1-13.293,13.293A13.308,13.308,0,0,1,561.562,197.4m0-2a15.293,15.293,0,1,0,15.293,15.293A15.293,15.293,0,0,0,561.562,195.4Z" />
  </g>
</symbol>

<symbol id="logout" viewBox="0 0 24 24" fill="none">
  <path
    d="M16 6.07026C18.3912 7.45349 20 10.0389 20 13C20 17.4183 16.4183 21 12 21C7.58172 21 4 17.4183 4 13C4 10.0389 5.60879 7.45349 8 6.07026M12 3V13"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
  />
</symbol>

Update the registry's supported names and any affected tests or documentation. Preserve the existing not-found fallback, default alias, sizes, and accessibility behavior.

Do not modify the sidebar or other page UI yet.

Verify the Angular build and relevant existing tests. Report results and usage examples for all three icons.
