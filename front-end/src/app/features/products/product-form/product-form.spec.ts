import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FormGroupDirective } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { routes } from '../../../app.routes';
import { SessionService } from '../../auth/session.service';
import { ProductForm } from './product-form';

describe('Product form', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
  }));
  beforeEach(() => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true, value: vi.fn(function (this: HTMLDialogElement) {
        this.open = true;
        this.querySelector<HTMLElement>('[autofocus]')?.focus();
      }),
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.open = false; }),
    });
  });
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.resetTestingModule();
  });

  function setup() {
    const fixture = TestBed.createComponent(ProductForm);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const input = (field: string, value: string) => {
      const control = element.querySelector<HTMLInputElement>(`#product-${field}`)!;
      control.value = value;
      control.dispatchEvent(new Event('input'));
    };
    const submit = () => {
      // Direct submit exercises validation independently of disabled button behavior.
      element.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      fixture.detectChanges();
    };
    const button = (label: string) => Array.from(element.querySelectorAll('button'))
      .find(button => button.textContent?.trim() === label)!;
    const form = fixture.debugElement.query(By.directive(FormGroupDirective)).injector.get(FormGroupDirective).form;
    return { fixture, element, input, submit, button, form };
  }

  it('shows accessible required errors and focuses the first invalid field', () => {
    const { element, submit } = setup();
    submit();
    expect(element.querySelectorAll('[aria-invalid="true"]').length).toBe(3);
    expect(document.activeElement?.id).toBe('product-title');
    expect(element.querySelector('#product-title')?.getAttribute('aria-describedby')).toBe('product-title-errors');
  });

  it('focuses the native price input and preserves exact decimal text and readable errors', () => {
    const { element, input, submit } = setup();
    input('title', 'Notebook'); input('price', '0001.2300'); input('stock', '0');
    submit();
    expect(document.activeElement?.id).toBe('product-price');
    expect(element.querySelector<HTMLInputElement>('#product-price')!.value).toBe('0001.2300');
    expect(element.querySelector('#product-price-errors')?.textContent).toContain('no more than 2 decimal places');
    expect(element.querySelector('#product-price')?.getAttribute('inputmode')).toBe('decimal');
    expect(element.querySelector('#product-stock')?.getAttribute('inputmode')).toBe('numeric');
  });

  it.each([
    ['title', '   '], ['title', 'x'.repeat(51)],
    ['price', '-1'], ['price', '10000000000'], ['price', '0.001'], ['price', 'abc'],
    ['stock', '-1'], ['stock', '1.5'], ['stock', '10000000000'],
  ])('rejects invalid %s: %s', (field, value) => {
    const { element, input, submit } = setup();
    input('title', 'Notebook'); input('price', '0'); input('stock', '0');
    input(field, value); submit();
    expect(element.querySelector(`#product-${field}`)?.getAttribute('aria-invalid')).toBe('true');
    expect(element.querySelector('[role="status"]')?.textContent).toBe('');
  });

  it.each([['0', '0'], ['9999999999.99', '9999999999']])('accepts boundaries without saving (%s, %s)', (price, stock) => {
    const { element, input, submit } = setup();
    input('title', 'x'.repeat(50)); input('price', price); input('stock', stock);
    submit();
    expect(element.querySelector('[aria-invalid="true"]')).toBeNull();
    expect(element.querySelector('[role="status"]')?.textContent).toContain('have not been saved');
    expect(element.querySelectorAll('input, textarea').length).toBe(4);
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  it('returns to the listing on Cancel', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const { element } = setup();
    Array.from(element.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Cancel')!.click();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/app/products']);
    expect(element.querySelector('dialog')!.open).toBe(false);
  });

  it('disables native submission while invalid or pending and keeps submit validation', () => {
    const { fixture, element, input, submit, button, form } = setup();
    const create = button('Create product');
    expect(create.disabled).toBe(true);
    create.click();
    expect(element.querySelector('[role="status"]')?.textContent).toBe('');
    input('title', 'Notebook'); input('price', '12'); input('stock', '2');
    fixture.detectChanges();
    expect(create.disabled).toBe(false);
    form.markAsPending();
    fixture.detectChanges();
    expect(create.disabled).toBe(true);
    submit();
    expect(element.querySelector('[role="status"]')?.textContent).toBe('');
    form.updateValueAndValidity();
    fixture.detectChanges();
    expect(create.disabled).toBe(false);
  });

  it.each(['Keep editing', 'Escape', 'Close dialog'])('preserves dirty edits on %s dismissal', dismissal => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const { fixture, element, input, button, form } = setup();
    input('title', 'Unsaved notebook');
    input('price', '12.50');
    input('description', 'Keep these details');
    input('stock', '3');
    const values = form.getRawValue();
    button('Cancel').focus();
    button('Cancel').click();
    fixture.detectChanges();
    const dialog = element.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('h2')?.textContent).toBe('Leave this page?');
    expect(dialog.textContent).toContain('Are you sure you want to leave? Your unsaved changes will be permanently lost.');
    expect(document.activeElement).toBe(button('Keep editing'));
    expect(button('Keep editing').type).toBe('button');
    expect(button('Leave without saving').type).toBe('button');
    expect(button('Leave without saving').classList.contains('app-button--error')).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
    if (dismissal === 'Escape') dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    else if (dismissal === 'Close dialog') dialog.querySelector<HTMLButtonElement>('[aria-label="Close dialog"]')!.click();
    else button('Keep editing').click();
    fixture.detectChanges();
    expect(dialog.open).toBe(false);
    expect(form.getRawValue()).toEqual(values);
    expect(form.dirty).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
    expect(element.querySelector('[role="status"]')?.textContent).toBe('');
    expect(document.activeElement).toBe(button('Cancel'));
    button('Cancel').click();
    fixture.detectChanges();
    expect(dialog.open).toBe(true);
  });

  it('closes the dirty-form confirmation and navigates only after confirming', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const { fixture, element, input, button } = setup();
    input('title', 'Unsaved notebook');
    button('Cancel').click();
    fixture.detectChanges();
    expect(navigate).not.toHaveBeenCalled();
    button('Leave without saving').click();
    fixture.detectChanges();
    expect(element.querySelector('dialog')!.open).toBe(false);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/app/products']);
    expect(element.querySelector('[role="status"]')?.textContent).toBe('');
  });

  it('opens inside the guarded layout with header and create mode', async () => {
    TestBed.inject(SessionService).establish({ accessToken: 'test', tokenType: 'Bearer', expiresIn: 900 });
    const harness = await RouterTestingHarness.create('/app/products/create');
    expect(TestBed.inject(Router).url).toBe('/app/products/create');
    expect(harness.routeNativeElement?.querySelector('app-product-form')).not.toBeNull();
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('New product');
    const route = TestBed.inject(Router).routerState.snapshot.root.firstChild!.firstChild!;
    expect(route.data['mode']).toBe('create');
    expect(route.data['pageSubtitle']).toBeTruthy();
  });
});
