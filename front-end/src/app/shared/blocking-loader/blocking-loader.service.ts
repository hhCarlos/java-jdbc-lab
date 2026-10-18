import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BlockingLoaderService {
  private readonly pending = signal(0);
  readonly visible = computed(() => this.pending() > 0);

  /** Returns an idempotent hide function. Overlapping callers release independently. */
  show(): () => void {
    this.pending.update((count) => count + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.pending.update((count) => count - 1);
    };
  }
}
