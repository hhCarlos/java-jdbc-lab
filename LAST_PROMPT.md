Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-19T21:27:12-06:00

Task prompt:

Create a notification component and a small state service alongside AppLayout.

Follow AGENTS.md and all applicable task prerequisites.

Requirements:
- Mount the component once inside AppLayout.
- Allow child pages to publish notifications that survive navigation within the layout.
- Display one notification at a time; new messages replace the previous one.
- Support success, error, warning, and loader statuses.
- Accept a message and an optional heading.
- Reuse the status icons already registered in AppIcon. Do not modify the icon system.

Appearance:
- Position it fixed at the top-right, fitting mobile screens.
- Use normal theme text colors and a neutral background.
- Color the icon using the corresponding semantic status token.
- Include an accessible X close button.
- Reuse existing themes, spacing, and notification-layer tokens.

Behavior:
- Success, error, and warning notifications dismiss after a configurable duration, defaulting to five seconds.
- Show a solid status-colored progress bar that fills until dismissal.
- Loader notifications have no timeout or countdown; animate their existing loader icon.
- Publishing returns a handle with hide() for explicit dismissal.
- X dismisses any notification without cancelling an underlying operation.
- An old timer or handle must not dismiss a newer notification.
- Clean up timers on replacement, dismissal, and destruction.
- Support accessible announcements and reduced motion.

Do not connect notifications to product operations or HTTP requests yet. Keep the fullscreen blocking loader unchanged.

Run relevant tests and the Angular build. Report results and provide minimal usage examples for a timed message and a manually dismissed loader notification.
