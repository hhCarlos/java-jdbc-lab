import { TestBed } from '@angular/core/testing';
import { AppButton, ButtonIconPosition, ButtonType, ButtonStatus, ButtonVariant } from './app-button';

function setup() {
  const fixture = TestBed.createComponent(AppButton);
  fixture.componentRef.setInput('label', 'Save');
  fixture.detectChanges();
  const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
  return { fixture, button };
}

describe('AppButton', () => {
  const appearances = (['default', 'success', 'error', 'warning'] satisfies ButtonStatus[])
    .flatMap(status => (['solid', 'ghost'] satisfies ButtonVariant[])
      .map(variant => ({ status, variant })));

  it.each(appearances)('applies $status/$variant without side effects and preserves disabled activation', ({ status, variant }) => {
    const { fixture, button } = setup();
    const pressed = vi.fn();
    fixture.componentInstance.pressed.subscribe(pressed);
    fixture.componentRef.setInput('status', status);
    fixture.componentRef.setInput('variant', variant);
    fixture.detectChanges();
    for (const semantic of ['success', 'error', 'warning']) {
      expect(button.classList.contains(`app-button--${semantic}`)).toBe(status === semantic);
    }
    expect(button.classList.contains('app-button--ghost')).toBe(variant === 'ghost');
    expect(button.textContent?.trim()).toBe('Save');
    expect(pressed).not.toHaveBeenCalled();
    button.click();
    expect(pressed).toHaveBeenCalledOnce();
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    pressed.mockClear();
    button.click();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(button.disabled).toBe(true);
    expect(pressed).not.toHaveBeenCalled();
  });

  it('renders text only without creating an icon or fallback and defaults to an enabled button', () => {
    const { fixture, button } = setup();
    expect(button.textContent?.trim()).toBe('Save');
    expect(button.type).toBe('button');
    expect(fixture.componentInstance.status()).toBe('default');
    expect(fixture.componentInstance.variant()).toBe('solid');
    expect(button.disabled).toBe(false);
    expect(button.querySelector('app-icon')).toBeNull();
    expect(button.querySelector('use')).toBeNull();
    expect(fixture.componentInstance.iconPosition()).toBe('left');
    expect(button.hasAttribute('aria-label')).toBe(false);
  });

  it.each(['left', 'right', 'top', 'bottom'] satisfies ButtonIconPosition[])
    ('places a decorative icon at %s', position => {
      const { fixture, button } = setup();
      fixture.componentRef.setInput('icon', 'products');
      fixture.componentRef.setInput('iconPosition', position);
      fixture.detectChanges();
      const iconFirst = position === 'left' || position === 'top';
      expect(Array.from(button.children, child => child.tagName))
        .toEqual(iconFirst ? ['APP-ICON', 'SPAN'] : ['SPAN', 'APP-ICON']);
      expect(button.classList.contains('app-button--vertical'))
        .toBe(position === 'top' || position === 'bottom');
      expect(button.querySelectorAll('app-icon')).toHaveLength(1);
      expect(button.querySelector('use')?.getAttribute('href')).toBe('icons/sprite.svg#products');
      const svg = button.querySelector('svg')!;
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.hasAttribute('aria-label')).toBe(false);
    });

  it('removes the icon when the optional icon input is cleared', () => {
    const { fixture, button } = setup();
    fixture.componentRef.setInput('icon', 'profile');
    fixture.detectChanges();
    expect(button.querySelector('app-icon')).not.toBeNull();
    fixture.componentRef.setInput('icon', undefined);
    fixture.detectChanges();
    expect(button.querySelector('app-icon')).toBeNull();
    expect(button.textContent?.trim()).toBe('Save');
  });

  it('emits the original native activation event exactly once without cancelling it', () => {
    const { fixture, button } = setup();
    const pressed = vi.fn();
    fixture.componentInstance.pressed.subscribe(pressed);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    button.dispatchEvent(event);
    expect(pressed).toHaveBeenCalledExactlyOnceWith(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('uses native disabled behavior and guards against manually dispatched clicks', () => {
    const { fixture, button } = setup();
    const pressed = vi.fn();
    fixture.componentInstance.pressed.subscribe(pressed);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    expect(button.disabled).toBe(true);
    button.click();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(pressed).not.toHaveBeenCalled();
    fixture.componentRef.setInput('disabled', false);
    fixture.detectChanges();
    button.click();
    expect(pressed).toHaveBeenCalledOnce();
  });

  it.each(['button', 'submit', 'reset'] satisfies ButtonType[])
    ('passes native type %s through', type => {
      const { fixture, button } = setup();
      fixture.componentRef.setInput('type', type);
      fixture.detectChanges();
      expect(button.type).toBe(type);
    });

  it('allows a submit button to trigger its containing form', () => {
    const { fixture, button } = setup();
    fixture.componentRef.setInput('type', 'submit');
    fixture.detectChanges();
    const form = document.createElement('form');
    form.append(fixture.nativeElement);
    document.body.append(form);
    const submitted = vi.fn((event: Event) => event.preventDefault());
    form.addEventListener('submit', submitted);
    const pressed = vi.fn();
    fixture.componentInstance.pressed.subscribe(pressed);
    try {
      button.click();
      expect(pressed).toHaveBeenCalledOnce();
      expect(submitted).toHaveBeenCalledOnce();
    } finally {
      form.remove();
    }
  });
});
