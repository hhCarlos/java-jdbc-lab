import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AppModal } from './app-modal';

@Component({
  imports: [AppModal],
  template: `<button (click)="open.set(true)">Open</button>
    <app-modal [open]="open()" title="Details" subtitle="More details" (closed)="dismiss()">
      <input aria-label="Projected input" />
    </app-modal>`,
})
class Host {
  open = signal(false);
  dismiss = vi.fn(() => this.open.set(false));
}

describe('AppModal', () => {
  beforeEach(() => {
    // jsdom cannot emulate top-layer inertness or native focus containment.
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
      this.querySelector<HTMLButtonElement>('button')?.focus();
    }) });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    }) });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.style.removeProperty('overflow');
    vi.restoreAllMocks();
  });
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    const open = () => {
      trigger.focus();
      trigger.click();
      fixture.detectChanges();
    };
    return { fixture, trigger, dialog, open };
  }
  it('opens modally and associates projected content, title and subtitle', () => {
    const { dialog, open } = setup();
    expect(dialog.open).toBe(false);
    open();
    expect(dialog.showModal).toHaveBeenCalledOnce();
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('input')).not.toBeNull();
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('Details');
    expect(document.getElementById(dialog.getAttribute('aria-describedby')!)?.textContent).toBe('More details');
  });
  it.each(['escape', 'button', 'native'])('dismisses via %s once and restores focus and scrolling', method => {
    document.body.style.setProperty('overflow', 'auto', 'important');
    const { fixture, trigger, dialog, open } = setup();
    open();
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.activeElement).toBe(dialog.querySelector('button'));
    if (method === 'escape') {
      const cancel = new Event('cancel', { cancelable: true });
      dialog.dispatchEvent(cancel);
      expect(cancel.defaultPrevented).toBe(true);
    } else if (method === 'button') {
      dialog.querySelector<HTMLButtonElement>('[aria-label="Close dialog"]')!.click();
    } else {
      dialog.close();
      dialog.dispatchEvent(new Event('close'));
    }
    dialog.dispatchEvent(new Event('close'));
    fixture.detectChanges();
    expect(fixture.componentInstance.dismiss).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.open()).toBe(false);
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe('auto');
    expect(document.body.style.getPropertyPriority('overflow')).toBe('important');
  });
  it('ignores backdrop clicks and closes from input without emitting dismissal', () => {
    const { fixture, dialog, open } = setup();
    open();
    dialog.click();
    expect(dialog.open).toBe(true);
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    dialog.dispatchEvent(new Event('close'));
    expect(dialog.open).toBe(false);
    expect(fixture.componentInstance.dismiss).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe('');
  });
  it('cleans up on destruction', () => {
    const { fixture, trigger, dialog, open } = setup();
    open();
    fixture.destroy();
    expect(dialog.open).toBe(false);
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(trigger);
  });
  it('keeps scrolling locked until the last modal closes', () => {
    const first = setup();
    const second = setup();
    first.open();
    second.open();
    first.fixture.destroy();
    expect(document.body.style.overflow).toBe('hidden');
    second.fixture.destroy();
    expect(document.body.style.overflow).toBe('');
  });
});
