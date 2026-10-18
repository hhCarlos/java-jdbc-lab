import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { BlockingLoaderService } from './blocking-loader.service';

@Component({
  selector: 'app-blocking-loader',
  standalone: true,
  templateUrl: './blocking-loader.html',
  styleUrl: './blocking-loader.scss',
})
export class BlockingLoader {
  readonly content = input.required<HTMLElement>();
  protected readonly loader = inject(BlockingLoaderService);
  private readonly document = inject(DOCUMENT);
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private release: (() => void) | undefined;

  constructor() {
    afterRenderEffect(() => {
      const active = this.loader.visible();
      const content = this.content();
      if (active && !this.release) this.block(content);
      if (!active) this.unblock();
    });
    inject(DestroyRef).onDestroy(() => this.unblock());
  }

  private block(content: HTMLElement): void {
    const panel = this.panel().nativeElement;
    const previousFocus = this.document.activeElement as HTMLElement | null;
    const previousInert = content.inert;
    const previousBusy = content.getAttribute('aria-busy');
    const roots = [this.document.documentElement, this.document.body];
    const overflow = roots.map((root) => ({
      value: root.style.getPropertyValue('overflow'),
      priority: root.style.getPropertyPriority('overflow'),
    }));
    const keepFocus = (event: FocusEvent) => {
      if (!panel.contains(event.target as Node)) panel.focus({ preventScroll: true });
    };
    const blockKeys = (event: KeyboardEvent) => {
      // No interactive controls exist in this blocking status overlay.
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    panel.focus({ preventScroll: true });
    content.inert = true;
    content.setAttribute('aria-busy', 'true');
    roots.forEach((root) => root.style.setProperty('overflow', 'hidden', 'important'));
    this.document.addEventListener('focusin', keepFocus, true);
    this.document.addEventListener('keydown', blockKeys, true);
    this.document.addEventListener('keyup', blockKeys, true);

    this.release = () => {
      this.document.removeEventListener('focusin', keepFocus, true);
      this.document.removeEventListener('keydown', blockKeys, true);
      this.document.removeEventListener('keyup', blockKeys, true);
      content.inert = previousInert;
      if (previousBusy === null) content.removeAttribute('aria-busy');
      else content.setAttribute('aria-busy', previousBusy);
      roots.forEach((root, index) => {
        const saved = overflow[index];
        if (saved.value) root.style.setProperty('overflow', saved.value, saved.priority);
        else root.style.removeProperty('overflow');
      });
      const currentFocus = this.document.activeElement;
      if (
        (currentFocus === panel || currentFocus === this.document.body) &&
        previousFocus?.isConnected &&
        !previousFocus.closest('[inert]')
      ) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }

  private unblock(): void {
    this.release?.();
    this.release = undefined;
  }
}
