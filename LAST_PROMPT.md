# Latest task prompt

Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-19T18:51:55-06:00

## Task prompt

Create a reusable standalone AppModal component in the frontend shared component structure.

Follow AGENTS.md and all applicable task prerequisites.

Public API:
- open: controls whether the modal is displayed.
- title: required.
- subtitle: optional.
- closed: output notifying the parent when the user requests closing.
- Project arbitrary body content through ng-content. Do not hardcode forms or actions.

Behavior:
- Prefer the native dialog element opened with showModal() for modal behavior without adding dependencies.
- Synchronize native dialog state with the open input.
- Block interaction with the underlying application while open.
- Close on Escape.
- Include a native close button aligned with the title, with the accessible label "Close dialog".
- Notify the parent on dismissal so its open state stays synchronized.
- Do not close when clicking the backdrop.
- Keep keyboard focus inside the modal and restore focus to the triggering element when it closes.
- Prevent background scrolling while open and restore the previous state on close or destruction.

Structure and styling:
- Header containing title, optional subtitle, and close button.
- Body containing projected content.
- Associate the dialog accessibly with its title and subtitle.
- Center it with responsive width and viewport margins.
- Allow long content to scroll without hiding the close button.
- Reuse existing theme, spacing, typography, and layering conventions.
- Follow BEM naming and support light/dark themes.

Do not integrate the modal into existing pages or modify the backend.

Verify opening, Escape dismissal, close-button behavior, focus restoration, and scrolling cleanup. Run relevant tests and the Angular build.

Document a minimal parent-component example controlling open and handling closed, with projected content.
