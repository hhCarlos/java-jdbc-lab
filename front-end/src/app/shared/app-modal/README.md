# AppModal

Import the standalone component and control its state in the parent:

```ts
import { Component, signal } from '@angular/core';
import { AppModal } from './shared/app-modal/app-modal';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [AppModal],
  template: `
    <button type="button" (click)="detailsOpen.set(true)">View details</button>
    <app-modal [open]="detailsOpen()" title="Details" subtitle="Additional information"
      (closed)="detailsOpen.set(false)">
      <p>Any parent-owned content can go here.</p>
      <button type="button" (click)="detailsOpen.set(false)">Done</button>
    </app-modal>
  `,
})
export class Example {
  readonly detailsOpen = signal(false);
}
```

Adjust the import path for the parent. `open` defaults to false, `title` is required,
and `subtitle` is optional. `closed` emits once on user dismissal; update the parent's
state in that handler. Setting `open` to false closes without emitting `closed`.
Backdrop clicks leave it open.

Native `showModal()` supplies top-layer rendering, background inertness and keyboard
focus containment. Initial focus defaults to the close button; projected content
can use `autofocus`. Closing restores the previously focused element if connected.
Background scrolling is locked until all AppModal instances close. Original inline
overflow and its priority are restored on closing or destruction.

The header stays visible while the body scrolls. Shared theme tokens provide light
and dark appearances. A browser with native dialog support is required.

Unit tests simulate dialog APIs because jsdom lacks native top-layer behavior and
layout. Browser verification: open using the keyboard, cycle Tab and Shift+Tab,
dismiss with Escape and the close button, and confirm focus returns to View details.
With long projected content, confirm body scrolling keeps the header visible,
backdrop clicks do nothing, and background scrolling resumes on close/destruction.
