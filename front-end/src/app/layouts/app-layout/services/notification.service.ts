import { Injectable, OnDestroy, signal } from '@angular/core';

export type NotificationStatus = 'success' | 'error' | 'warning' | 'loader';
export interface NotificationOptions {
  status: NotificationStatus;
  message: string;
  heading?: string;
  /** Milliseconds; ignored for loaders. Defaults to 5000. */
  duration?: number;
}
export interface NotificationHandle { hide(): void; }
export interface NotificationState extends NotificationOptions {
  readonly id: number;
  readonly duration: number;
}

@Injectable()
export class NotificationService implements OnDestroy {
  private readonly state = signal<NotificationState | null>(null);
  readonly current = this.state.asReadonly();
  private timer?: ReturnType<typeof setTimeout>;
  private sequence = 0;
  private destroyed = false;

  publish(options: NotificationOptions): NotificationHandle {
    const id = ++this.sequence;
    const hide = () => this.hide(id);
    if (this.destroyed) return { hide };
    this.clearTimer();
    const duration = options.duration ?? 5000;
    const notification = {
      ...options, id,
      duration: Number.isFinite(duration) && duration >= 0 ? duration : 5000,
    };
    this.state.set(notification);
    if (options.status !== 'loader') {
      this.timer = setTimeout(hide, notification.duration);
    }
    return { hide };
  }

  hide(id: number): void {
    if (this.state()?.id !== id) return;
    this.clearTimer();
    this.state.set(null);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.clearTimer();
    this.state.set(null);
  }

  private clearTimer(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
  }
}
