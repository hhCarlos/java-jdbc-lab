import { TestBed } from '@angular/core/testing';
import { AppIcon } from './app-icon';
import { ICON_REGISTRY } from './icon-registry';

describe('AppIcon', () => {
  it.each(Object.entries(ICON_REGISTRY))('resolves registered name %s to %s', (name, symbol) => {
    const fixture = TestBed.createComponent(AppIcon);
    fixture.componentRef.setInput('name', name);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('use').getAttribute('href'))
      .toBe(`icons/sprite.svg#${symbol}`);
  });

  it('renders the fallback when name is omitted', () => {
    const fixture = TestBed.createComponent(AppIcon);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('use').getAttribute('href'))
      .toBe('icons/sprite.svg#not-found');
  });

  it.each([null, undefined, '', ' \n\t ', 'unknown', 'placeholder', 'toString', '__proto__', '#other'])
    ('renders the fallback for %s', name => {
      const fixture = TestBed.createComponent(AppIcon);
      fixture.componentRef.setInput('name', name);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('use').getAttribute('href'))
        .toBe('icons/sprite.svg#not-found');
    });

  it('updates the resolved reference when the input changes', () => {
    const fixture = TestBed.createComponent(AppIcon);
    for (const name of ['products', 'profile', 'logout', 'default', 'unknown', 'not-found', null]) {
      fixture.componentRef.setInput('name', name);
      fixture.detectChanges();
      const expected = name === 'products' || name === 'profile' || name === 'logout'
        ? name : 'not-found';
      expect(fixture.nativeElement.querySelector('use').getAttribute('href'))
        .toBe(`icons/sprite.svg#${expected}`);
    }
  });

  it('preserves size options and defaults to md', () => {
    const fixture = TestBed.createComponent(AppIcon);
    fixture.detectChanges();
    expect(fixture.nativeElement.getAttribute('data-size')).toBe('md');
    for (const size of ['sm', 'md', 'xl', 'xll']) {
      fixture.componentRef.setInput('size', size);
      fixture.detectChanges();
      expect(fixture.nativeElement.getAttribute('data-size')).toBe(size);
    }
  });

  it('keeps fallback icons decorative unless given a meaningful label', () => {
    const fixture = TestBed.createComponent(AppIcon);
    fixture.detectChanges();
    const svg: SVGElement = fixture.nativeElement.querySelector('svg');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
    expect(svg.hasAttribute('role')).toBe(false);
    for (const label of [' Missing image ', '  ', undefined]) {
      fixture.componentRef.setInput('label', label);
      fixture.detectChanges();
      expect(svg.getAttribute('aria-label')).toBe(label?.trim() || null);
      expect(svg.getAttribute('role')).toBe(label?.trim() ? 'img' : null);
      expect(svg.getAttribute('aria-hidden')).toBe(label?.trim() ? null : 'true');
    }
  });
});
