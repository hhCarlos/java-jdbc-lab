import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FormGroupDirective } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BehaviorSubject } from 'rxjs';
import { ProductsService } from '../products.service';
import { vi } from 'vitest';
import { routes } from '../../../app.routes';
import { SessionService } from '../../auth/session.service';
import { BlockingLoaderService } from '../../../shared/blocking-loader/blocking-loader.service';
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

  function editSetup(id: string | null, mode = 'edit') {
    const data = new BehaviorSubject({ mode });
    const paramMap = new BehaviorSubject(convertToParamMap(id === null ? {} : { id }));
    TestBed.overrideProvider(ActivatedRoute, { useValue: { data, paramMap } });
    return { ...setup(), data, paramMap };
  }

  it.each(['1', '9007199254740993', '9223372036854775807'])('disables edit mode for valid ID %s and blocks programmatic creation', id => {
    const { fixture, element, form, submit, button } = editSetup(id);
    const create = vi.spyOn(TestBed.inject(ProductsService), 'create');
    expect(fixture.componentInstance['mode']()).toBe('edit');
    expect(fixture.componentInstance['productId']()).toBe(id);
    expect(element.textContent).toContain('Editing products is not available yet.');
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(form.disabled).toBe(true);
    expect(Array.from(element.querySelectorAll<HTMLInputElement>('input, textarea')).every(input => input.disabled)).toBe(true);
    expect(button('Save changes').disabled).toBe(true);
    // Even bypassing disabled controls must never turn edit submission into creation.
    form.enable();
    form.setValue({ title: 'Valid', price: '1', description: '', stock: '1' });
    submit();
    fixture.componentInstance['submit']();
    expect(create).not.toHaveBeenCalled();
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  it.each([null, '', '0', '-1', '1.5', '1e2', 'abc', ' 1', '9223372036854775808'])('rejects invalid edit ID %s', id => {
    const { fixture, element, submit, button } = editSetup(id);
    expect(fixture.componentInstance['productId']()).toBeNull();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Invalid product ID');
    expect(button('Save changes').disabled).toBe(true);
    submit();
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  it('uses route data for mode and responds to reused route changes', () => {
    const { fixture, data, paramMap, form, element } = editSetup('bad', 'create');
    expect(fixture.componentInstance['mode']()).toBe('create');
    expect(form.enabled).toBe(true);
    expect(element.querySelector('[role="alert"]')).toBeNull();
    data.next({ mode: 'edit' });
    fixture.detectChanges();
    expect(form.disabled).toBe(true);
    expect(element.querySelector('[role="alert"]')).not.toBeNull();
    paramMap.next(convertToParamMap({ id: '42' }));
    fixture.detectChanges();
    expect(fixture.componentInstance['productId']()).toBe('42');
    expect(element.querySelector('[role="alert"]')).toBeNull();
    data.next({ mode: 'create' });
    expect(form.enabled).toBe(true);
    expect(fixture.componentInstance['productId']()).toBeNull();
  });

  it('keeps Cancel navigation available in edit mode', () => {
    const { button } = editSetup('42');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    button('Cancel').click();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/app/products']);
  });

  it('opens the edit route with its metadata and the existing form', async () => {
    TestBed.inject(SessionService).establish({ accessToken: 'test', tokenType: 'Bearer', expiresIn: 900 });
    const harness = await RouterTestingHarness.create('/app/products/edit/42');
    expect(harness.routeNativeElement?.querySelector('app-product-form')).not.toBeNull();
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Edit product');
    const route = TestBed.inject(Router).routerState.snapshot.root.firstChild!.firstChild!;
    expect(route.data).toEqual({ mode: 'edit', pageTitle: 'Edit product', pageSubtitle: 'Update your product details.' });
    expect(harness.routeNativeElement?.textContent).toContain('Editing products is not available yet.');
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

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
    expect(element.textContent).not.toContain('Saving products is not available yet');
  });

  it.each([['0', '0'], ['9999999999.99', '9999999999']])('submits valid boundaries without rounding (%s, %s)', (price, stock) => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const { element, input, submit, form } = setup();
    input('title', 'x'.repeat(50)); input('price', price); input('stock', stock);
    submit();
    expect(element.querySelector('[aria-invalid="true"]')).toBeNull();
    const request = TestBed.inject(HttpTestingController).expectOne('/api/users/me/products');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ title: 'x'.repeat(50), price: Number(price), description: '', stock: Number(stock) });
    expect(navigate).not.toHaveBeenCalled();
    expect(form.dirty).toBe(true);
    expect(TestBed.inject(BlockingLoaderService).visible()).toBe(true);
    request.flush({ id: 1 });
    expect(form.pristine).toBe(true);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/app/products']);
    expect(TestBed.inject(BlockingLoaderService).visible()).toBe(false);
    expect(form.getRawValue().price).toBe(price);
    expect(element.querySelectorAll('input, textarea').length).toBe(4);
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  it('prevents duplicates and preserves failed values for retry', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const { fixture, input, submit, form, button } = setup();
    input('title', 'Notebook'); input('price', '0012.50');
    input('description', 'Details'); input('stock', '3');
    const values = form.getRawValue();
    submit(); submit();
    expect(button('Create product').disabled).toBe(true);
    const request = TestBed.inject(HttpTestingController).expectOne('/api/users/me/products');
    expect(request.request.body).toEqual({ title: 'Notebook', price: 12.5, description: 'Details', stock: 3 });
    expect(TestBed.inject(BlockingLoaderService).visible()).toBe(true);
    request.flush({ private: 'details' }, { status: 500, statusText: 'Failure' });
    fixture.detectChanges();
    expect(form.getRawValue()).toEqual(values);
    expect(form.dirty).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledExactlyOnceWith('Unable to create product. Please try again.');
    expect(TestBed.inject(BlockingLoaderService).visible()).toBe(false);
    expect(fixture.componentInstance['submitting']()).toBe(false);
    expect(button('Create product').disabled).toBe(false);
    submit();
    TestBed.inject(HttpTestingController).expectOne('/api/users/me/products').flush({ id: 1 });
    log.mockRestore();
  });

  it('cancels pending creation on destruction and releases only its loader', () => {
    const { fixture, input, submit } = setup();
    const loader = TestBed.inject(BlockingLoaderService);
    const releaseOther = loader.show();
    input('title', 'Notebook'); input('price', '12.50'); input('stock', '3');
    submit();
    const request = TestBed.inject(HttpTestingController).expectOne('/api/users/me/products');
    fixture.destroy();
    expect(request.cancelled).toBe(true);
    expect(fixture.componentInstance['submitting']()).toBe(false);
    expect(loader.visible()).toBe(true);
    releaseOther();
    expect(loader.visible()).toBe(false);
  });

  it('fetches exactly one fresh server page when returning after creation', async () => {
    TestBed.inject(SessionService).establish({ accessToken: 'test', tokenType: 'Bearer', expiresIn: 900 });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create('/app/products');
    const listingUrl = '/api/users/me/products?page=0&pageSize=20';
    http.expectOne(listingUrl).flush([]);
    await harness.navigateByUrl('/app/products/create');
    const element = harness.routeNativeElement!;
    for (const [field, value] of [['title', 'Fresh notebook'], ['price', '12.50'], ['stock', '3']]) {
      const input = element.querySelector<HTMLInputElement>(`#product-${field}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    element.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const created = { id: 1, title: 'Fresh notebook', price: 12.5, description: '', stock: 3, statusCode: 'ACTIVE' };
    http.expectOne('/api/users/me/products').flush(created);
    await harness.fixture.whenStable();
    http.expectOne(listingUrl).flush([created]);
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/app/products');
    expect(harness.routeNativeElement?.textContent).toContain('Fresh notebook');
    http.expectNone(() => true);
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
    expect(element.textContent).not.toContain('Saving products is not available yet');
    input('title', 'Notebook'); input('price', '12'); input('stock', '2');
    fixture.detectChanges();
    expect(create.disabled).toBe(false);
    form.markAsPending();
    fixture.detectChanges();
    expect(create.disabled).toBe(true);
    submit();
    expect(element.textContent).not.toContain('Saving products is not available yet');
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
    expect(element.textContent).not.toContain('Saving products is not available yet');
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
    expect(element.textContent).not.toContain('Saving products is not available yet');
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
