Notifications are provided by AppLayout and shared by its routed descendants.
Inject NotificationService in a child page; do not provide it again there.

```ts
import { inject } from '@angular/core';
import { NotificationService } from './services/notification.service'; // Adjust relative path.

private readonly notifications = inject(NotificationService);

// Timed message (duration in milliseconds; default 5000).
this.notifications.publish({
  status: 'success', message: 'Changes saved.', heading: 'Saved', duration: 5000,
});

// Loader: remains visible until dismissed or replaced.
const loader = this.notifications.publish({ status: 'loader', message: 'Working…' });
loader.hide(); // Call when appropriate; safe even after another message replaces it.
```

Statuses: success, error, warning, loader. Each publish replaces the current
notification. The X button only hides the notification; it does not cancel work.
Leaving AppLayout clears its state and timer. Errors are announced assertively;
other statuses politely. Reduced motion disables rotation and progress animation
while retaining automatic dismissal. Progress is decorative and excluded from
accessible announcements. No product operations are connected to this API yet.
