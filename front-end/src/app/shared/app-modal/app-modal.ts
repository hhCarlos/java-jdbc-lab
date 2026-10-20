import { DOCUMENT } from '@angular/common';
import {
  booleanAttribute, Component, effect, ElementRef, inject, input, OnDestroy, output, viewChild,
} from '@angular/core';

let nextId = 0;
const scrollLocks = new WeakMap<Document, { count: number; value: string; priority: string }>();

@Component({
  selector: 'app-modal',
  standalone: true,
  templateUrl: './app-modal.html',
  styleUrl: './app-modal.scss',
})
export class AppModal implements OnDestroy {
  readonly open = input(false, { transform: booleanAttribute });
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly closed = output<void>();

  protected readonly titleId = `app-modal-title-${nextId++}`;
  protected readonly subtitleId = `${this.titleId}-subtitle`;
  private readonly document = inject(DOCUMENT);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private active = false;
  private trigger: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const dialog = this.dialog()?.nativeElement;
      if (!dialog) return;
      if (this.open() && !dialog.open) {
        this.trigger = this.document.activeElement as HTMLElement | null;
        dialog.showModal();
        this.active = true;
        this.lockScroll();
      } else if (!this.open() && dialog.open) {
        dialog.close();
        this.release();
      }
    });
  }

  protected dismiss(event?: Event): void {
    event?.preventDefault();
    if (!this.active) return;
    this.dialog()?.nativeElement.close();
    this.release();
    this.closed.emit();
  }

  protected nativeClosed(): void {
    // close events are queued: ignore an old event if the dialog has reopened.
    if (!this.active || this.dialog()?.nativeElement.open) return;
    this.release();
    this.closed.emit();
  }

  ngOnDestroy(): void {
    this.dialog()?.nativeElement.close();
    this.release();
  }

  private lockScroll(): void {
    const style = this.document.body.style;
    const lock = scrollLocks.get(this.document) ?? {
      count: 0, value: style.getPropertyValue('overflow'), priority: style.getPropertyPriority('overflow'),
    };
    lock.count++;
    scrollLocks.set(this.document, lock);
    style.setProperty('overflow', 'hidden');
  }

  private release(): void {
    if (!this.active) return;
    this.active = false;
    const lock = scrollLocks.get(this.document)!;
    if (--lock.count === 0) {
      const style = this.document.body.style;
      if (lock.value) style.setProperty('overflow', lock.value, lock.priority);
      else style.removeProperty('overflow');
      scrollLocks.delete(this.document);
    }
    if (this.trigger?.isConnected) this.trigger.focus({ preventScroll: true });
    this.trigger = null;
  }
}
