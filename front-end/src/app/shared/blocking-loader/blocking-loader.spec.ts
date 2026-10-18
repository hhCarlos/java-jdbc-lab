import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BlockingLoader } from './blocking-loader';
import { BlockingLoaderService } from './blocking-loader.service';

@Component({
  imports: [BlockingLoader],
  template:
    '<section #content><button>Action</button></section><app-blocking-loader [content]="content" />',
})
class Host {}

describe('BlockingLoader', () => {
  it('keeps overlapping callers visible until each releases, with idempotent cleanup', () => {
    const service = TestBed.inject(BlockingLoaderService);
    expect(service.visible()).toBe(false);
    const first = service.show();
    const second = service.show();
    first();
    first();
    expect(service.visible()).toBe(true);
    second();
    expect(service.visible()).toBe(false);
  });

  it('blocks content, marks it busy, and restores focus and pre-existing scroll styles', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const content: HTMLElement = fixture.nativeElement.querySelector('section');
    const button: HTMLButtonElement = content.querySelector('button')!;
    const panel: HTMLElement = fixture.nativeElement.querySelector('.blocking-loader');
    document.body.appendChild(fixture.nativeElement);
    document.body.style.setProperty('overflow', 'scroll', 'important');
    content.setAttribute('aria-busy', 'false');
    button.focus();
    expect(panel.hidden).toBe(true);
    const hide = TestBed.inject(BlockingLoaderService).show();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(panel.hidden).toBe(false);
    expect(content.inert).toBe(true);
    expect(content.getAttribute('aria-busy')).toBe('true');
    expect(document.activeElement).toBe(panel);
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    panel.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    hide();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(panel.hidden).toBe(true);
    expect(content.inert).toBeFalsy();
    expect(content.getAttribute('aria-busy')).toBe('false');
    expect(document.activeElement).toBe(button);
    expect(document.body.style.overflow).toBe('scroll');
    expect(document.body.style.getPropertyPriority('overflow')).toBe('important');
    fixture.destroy();
    document.body.style.removeProperty('overflow');
  });

  it('releases restrictions when destroyed while active', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const content: HTMLElement = fixture.nativeElement.querySelector('section');
    const hide = TestBed.inject(BlockingLoaderService).show();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(content.inert).toBe(true);
    fixture.destroy();
    expect(content.inert).toBeFalsy();
    expect(content.hasAttribute('aria-busy')).toBe(false);
    expect(document.body.style.overflow).toBe('');
    const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    hide();
  });
});
