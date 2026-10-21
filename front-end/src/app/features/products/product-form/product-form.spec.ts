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
import { NotificationService } from '../../../layouts/app-layout/services/notification.service';

describe('Product form', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting(), NotificationService],
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

  const product = { id: 42, title: 'Notebook', price: 12.345, description: null, stock: 3, statusCode: 'ACTIVE' };

  it.each(['Keep product', 'Escape', 'Close dialog'])('preserves edits and stays silent on deletion dismissal via %s', dismissal => {
    const { fixture, element, input, form, button } = editSetup('42');
    expect(Array.from(element.querySelectorAll('form button')).some(b => b.textContent?.trim() === 'Delete product')).toBe(false);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/users/me/products/42').flush(product);
    input('title', '');
    fixture.detectChanges();
    const values = form.getRawValue();
    const trigger = button('Delete product');
    expect(trigger.type).toBe('button');
    expect(trigger.classList.contains('app-button--error')).toBe(true);
    expect(trigger.disabled).toBe(false);
    trigger.focus(); trigger.click(); fixture.detectChanges();
    const dialog = element.querySelector<HTMLDialogElement>('dialog[open]')!;
    expect(dialog.querySelector('h2')?.textContent).toBe('Delete product?');
    expect(dialog.textContent).toContain('This product will no longer appear in your products or the public catalog. Any unsaved changes will be discarded.');
    expect(document.activeElement).toBe(button('Keep product'));
    if (dismissal === 'Escape') dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    else if (dismissal === 'Close dialog') dialog.querySelector<HTMLButtonElement>('[aria-label="Close dialog"]')!.click();
    else button('Keep product').click();
    fixture.detectChanges();
    expect(dialog.open).toBe(false);
    expect(form.getRawValue()).toEqual(values);
    expect(form.dirty).toBe(true);
    expect(TestBed.inject(NotificationService).current()).toBeNull();
    http.expectNone(() => true);
  });

  it('confirms deletion with the exact route ID, blocks all duplicate writes and cleans up on success', () => {
    const { fixture, input, form, button, submit, element } = editSetup('9007199254740993');
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/users/me/products/9007199254740993').flush(product);
    input('title', ''); fixture.detectChanges();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    button('Delete product').click(); fixture.detectChanges();
    submit(); http.expectNone(() => true);
    fixture.componentInstance['confirmDeletion']();
    fixture.componentInstance['confirmDeletion']();
    fixture.componentInstance['requestDeletion'](); submit();
    fixture.detectChanges();
    expect(element.querySelector('dialog[open]')).toBeNull();
    expect(button('Delete product').disabled).toBe(true);
    expect(TestBed.inject(BlockingLoaderService).visible()).toBe(true);
    expect(TestBed.inject(NotificationService).current()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
    const pending = http.expectOne('/api/users/me/products/9007199254740993');
    expect(pending.request.method).toBe('DELETE');
    pending.flush(null, { status: 204, statusText: 'No Content' });
    expect(TestBed.inject(NotificationService).current()).toMatchObject({ status: 'success', message: 'Product deleted successfully.' });
    expect(form.pristine).toBe(true);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/app/products']);
    expect(TestBed.inject(BlockingLoaderService).visible()).toBe(false);
    expect(fixture.componentInstance['submitting']()).toBe(false);
  });

  it('preserves failed deletion edits, allows retry, and releases its loader on cancellation', () => {
    const { fixture, input, form, button } = editSetup('42');
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/users/me/products/42').flush(product);
    input('title', 'Keep these edits'); fixture.detectChanges();
    const values = form.getRawValue();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    button('Delete product').click(); fixture.detectChanges();
    fixture.componentInstance['confirmDeletion']();
    http.expectOne('/api/users/me/products/42').flush({ secret: 'server details' }, { status: 500, statusText: 'Failure' });
    fixture.detectChanges();
    expect(form.getRawValue()).toEqual(values);
    expect(form.dirty).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
    expect(TestBed.inject(NotificationService).current()).toMatchObject({ status: 'error', message: 'Unable to delete the product. Please try again.' });
    const loader = TestBed.inject(BlockingLoaderService);
    expect(loader.visible()).toBe(false);
    expect(button('Delete product').disabled).toBe(false);
    const releaseOther = loader.show();
    button('Delete product').click(); fixture.detectChanges();
    fixture.componentInstance['confirmDeletion']();
    const pending = http.expectOne('/api/users/me/products/42');
    fixture.destroy();
    expect(pending.cancelled).toBe(true);
    expect(fixture.componentInstance['submitting']()).toBe(false);
    expect(loader.visible()).toBe(true);
    releaseOther(); expect(loader.visible()).toBe(false);
    expect(TestBed.inject(NotificationService).current()?.status).toBe('error');
  });

  it('keeps deletion unavailable during an update', () => {
    const { fixture, input, submit, button } = editSetup('42');
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/users/me/products/42').flush({ ...product, price: 12.34 });
    input('title', 'Changed'); submit();
    expect(button('Delete product').disabled).toBe(true);
    fixture.componentInstance['requestDeletion']();
    expect(fixture.componentInstance['deleteConfirmationOpen']()).toBe(false);
    http.expectOne('/api/users/me/products/42').flush({}, { status: 500, statusText: 'Failure' });
  });

  it('fetches a fresh listing and retains the layout success notification after deletion', async () => {
    TestBed.inject(SessionService).establish({ accessToken: 'test', tokenType: 'Bearer', expiresIn: 900 });
    const harness = await RouterTestingHarness.create('/app/products/edit/42');
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/users/me/products/42').flush(product);
    harness.detectChanges();
    const notifications = harness.routeDebugElement!.injector.get(NotificationService);
    const element = harness.routeNativeElement!;
    const trigger = Array.from(element.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Delete product')!;
    trigger.click(); harness.detectChanges();
    const dialog = element.querySelector('dialog[open]')!;
    Array.from(dialog.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Delete product')!.click();
    http.expectOne('/api/users/me/products/42').flush(null, { status: 204, statusText: 'No Content' });
    await harness.fixture.whenStable();
    http.expectOne('/api/users/me/products?page=0&pageSize=20').flush([]);
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/app/products');
    expect(harness.routeDebugElement!.injector.get(NotificationService)).toBe(notifications);
    const notification = harness.routeNativeElement?.querySelector('[aria-label="Notification"]');
    expect(notification?.getAttribute('data-status')).toBe('success');
    expect(notification?.textContent).toContain('Product deleted successfully.');
    expect(TestBed.inject(BlockingLoaderService).visible()).toBe(false);
  });

  it.each(['ACTIVE', 'INACTIVE'])('initializes suspension from %s only after loading, pristine and accessible', statusCode => {
    const { fixture, element, form, button } = editSetup('42');
    expect(element.querySelector('#product-suspended')).toBeNull();
    TestBed.inject(HttpTestingController).expectOne('/api/users/me/products/42')
      .flush({ ...product, price: 12.34, statusCode });
    fixture.detectChanges();
    const checkbox = element.querySelector<HTMLInputElement>('#product-suspended')!;
    expect(checkbox.type).toBe('checkbox');
    expect(checkbox.checked).toBe(statusCode === 'INACTIVE');
    expect(form.controls['suspended'].value).toBe(statusCode === 'INACTIVE');
    expect(form.pristine).toBe(true);
    expect(button('Save changes').disabled).toBe(true);
    expect(element.querySelector('label[for="product-suspended"]')?.textContent).toBe('Suspend Product');
    expect(checkbox.getAttribute('aria-describedby')).toBe('product-suspended-description product-suspended-stock');
    expect(element.querySelector('#product-suspended-description')?.textContent)
      .toBe('Suspend this product to hide it from the public catalog.');
    expect(element.querySelector('#product-suspended-stock')?.textContent).toBe('Add stock before reactivating this product.');
    expect(element.querySelector('.product-form__information-icon use')?.getAttribute('href'))
      .toBe('icons/sprite.svg#information');
  });

  it.each(['ACTIVE', 'INACTIVE'])('saves a status-only %s edit through native controls without forced change detection', async statusCode => {
    const { fixture, element, form, button } = editSetup('42');
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/users/me/products/42').flush({ ...product, price: 12.34, statusCode });
    await fixture.whenStable();
    const checkbox = element.querySelector<HTMLInputElement>('#product-suspended')!;
    expect(checkbox.disabled).toBe(false);
    expect(checkbox.checked).toBe(statusCode === 'INACTIVE');
    expect(button('Save changes').disabled).toBe(true);
    checkbox.click();
    await fixture.whenStable();
    expect(form.valid).toBe(true);
    expect(form.dirty).toBe(true);
    expect(button('Save changes').disabled).toBe(false);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    button('Save changes').click();
    const pending = http.expectOne('/api/users/me/products/42');
    expect(pending.request.method).toBe('PUT');
    expect(pending.request.body).toEqual({ title: product.title, price: 12.34,
      description: '', stock: 3, active: statusCode === 'INACTIVE' });
    pending.flush({ ...product, price: 12.34, statusCode: statusCode === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
    await fixture.whenStable();
    expect(form.pristine).toBe(true);
  });

  it.each(['ACTIVE', 'INACTIVE'])('tracks checkbox edits and maps %s suspension to PUT active', statusCode => {
    const { fixture, element, form, button, submit } = editSetup('42');
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/users/me/products/42').flush({ ...product, price: 12.34, statusCode });
    fixture.detectChanges();
    const checkbox = element.querySelector<HTMLInputElement>('#product-suspended')!;
    checkbox.click(); fixture.detectChanges();
    expect(form.dirty).toBe(true);
    expect(form.controls['suspended'].dirty).toBe(true);
    expect(button('Save changes').disabled).toBe(false);
    button('Cancel').click(); fixture.detectChanges();
    expect(fixture.componentInstance['cancelConfirmationOpen']()).toBe(true);
    button('Keep editing').click(); fixture.detectChanges();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    submit();
    const pending = http.expectOne('/api/users/me/products/42');
    expect(pending.request.method).toBe('PUT');
    expect(pending.request.body).toEqual({ title: product.title, price: 12.34,
      description: '', stock: 3, active: !checkbox.checked });
    pending.flush({ ...product, price: 12.34, statusCode: 'INACTIVE' });
    fixture.detectChanges();
    expect(checkbox.checked).toBe(true);
    expect(form.pristine).toBe(true);
  });

  it.each(['ACTIVE', 'INACTIVE'])('forces zero-stock %s products checked and disabled without dirtying initialization', statusCode => {
    const { fixture, element, form, input, submit, button } = editSetup('42');
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/users/me/products/42').flush({ ...product, price: 12.34, stock: 0, statusCode });
    fixture.detectChanges();
    const checkbox = element.querySelector<HTMLInputElement>('#product-suspended')!;
    expect(checkbox.checked).toBe(true);
    expect(checkbox.disabled).toBe(true);
    expect(form.controls['suspended'].disabled).toBe(true);
    expect(form.value.suspended).toBeUndefined();
    expect(form.getRawValue().suspended).toBe(true);
    expect(form.pristine).toBe(true);
    expect(form.untouched).toBe(true);
    expect(button('Save changes').disabled).toBe(true);
    checkbox.click();
    expect(form.pristine).toBe(true);
    input('title', 'Updated');
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    submit();
    const pending = http.expectOne('/api/users/me/products/42');
    expect(pending.request.body).toEqual({ title: 'Updated', price: 12.34, description: '', stock: 0, active: false });
    pending.flush({ ...product, price: 12.34, stock: 0, statusCode: 'INACTIVE' });
    expect(form.controls['suspended'].value).toBe(true);
    expect(form.pristine).toBe(true);
  });

  it('checks and disables immediately at zero and keeps suspension until explicit reactivation after restocking', () => {
    const { fixture, element, form, input, submit } = editSetup('42');
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/users/me/products/42').flush({ ...product, price: 12.34 });
    fixture.detectChanges();
    const checkbox = element.querySelector<HTMLInputElement>('#product-suspended')!;
    expect(checkbox.checked).toBe(false);
    expect(checkbox.disabled).toBe(false);
    input('stock', '0');
    expect(form.controls['suspended'].value).toBe(true);
    expect(form.controls['suspended'].disabled).toBe(true);
    expect(form.controls['suspended'].pristine).toBe(true);
    expect(form.dirty).toBe(true);
    fixture.detectChanges();
    expect(checkbox.checked).toBe(true);
    expect(checkbox.disabled).toBe(true);
    input('stock', '5'); fixture.detectChanges();
    expect(checkbox.disabled).toBe(false);
    expect(checkbox.checked).toBe(true);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    submit();
    let pending = http.expectOne('/api/users/me/products/42');
    expect(pending.request.body.active).toBe(false);
    expect(form.controls['suspended'].disabled).toBe(true);
    pending.flush({ ...product, price: 12.34, stock: 5, statusCode: 'INACTIVE' });
    fixture.detectChanges();
    expect(checkbox.disabled).toBe(false);
    checkbox.click(); fixture.detectChanges();
    expect(form.dirty).toBe(true);
    submit();
    pending = http.expectOne('/api/users/me/products/42');
    expect(pending.request.body).toEqual({ title: product.title, price: 12.34, description: '', stock: 5, active: true });
    pending.flush({ ...product, price: 12.34, stock: 5, statusCode: 'ACTIVE' });
    fixture.detectChanges();
    expect(checkbox.checked).toBe(false);
    expect(form.pristine).toBe(true);
  });

  it.each([false, true])('restocks an initially zero-stock product with explicit reactivation=%s', reactivate => {
    const { fixture, element, form, input, submit, button } = editSetup('42');
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/users/me/products/42').flush({ ...product, price: 12.34, stock: 0, statusCode: 'INACTIVE' });
    fixture.detectChanges();
    const checkbox = element.querySelector<HTMLInputElement>('#product-suspended')!;
    expect(checkbox.checked).toBe(true);
    expect(checkbox.disabled).toBe(true);
    expect(form.pristine).toBe(true);
    input('stock', '5'); fixture.detectChanges();
    expect(checkbox.disabled).toBe(false);
    expect(checkbox.checked).toBe(true);
    if (reactivate) checkbox.click();
    input('title', 'Restocked notebook');
    input('price', '15.50');
    input('description', 'Updated details');
    input('stock', '6'); fixture.detectChanges();
    expect(checkbox.checked).toBe(!reactivate);
    expect(button('Save changes').disabled).toBe(false);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    submit();
    const pending = http.expectOne('/api/users/me/products/42');
    expect(pending.request.method).toBe('PUT');
    expect(pending.request.body).toEqual({ title: 'Restocked notebook', price: 15.5,
      description: 'Updated details', stock: 6, active: reactivate });
    pending.flush({ ...product, price: 15.5, stock: 6, statusCode: reactivate ? 'ACTIVE' : 'INACTIVE' });
    expect(form.pristine).toBe(true);
  });

  it.each(['', '-1', '1.5', '10000000000', 'abc'])('disables suspension for invalid stock %j and preserves its value', stock => {
    const { fixture, element, form, input } = editSetup('42');
    TestBed.inject(HttpTestingController).expectOne('/api/users/me/products/42').flush({ ...product, price: 12.34 });
    input('stock', stock); fixture.detectChanges();
    const checkbox = element.querySelector<HTMLInputElement>('#product-suspended')!;
    expect(checkbox.disabled).toBe(true);
    expect(checkbox.checked).toBe(false);
    expect(form.invalid).toBe(true);
    input('stock', '1'); fixture.detectChanges();
    expect(checkbox.disabled).toBe(false);
    expect(checkbox.checked).toBe(false);
  });

  it('keeps suspension disabled if stock changes during an update and restores its state after failure', () => {
    const { fixture, element, form, input, submit } = editSetup('42');
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/users/me/products/42').flush({ ...product, price: 12.34 });
    input('title', 'Updated'); submit();
    expect(form.controls['suspended'].disabled).toBe(true);
    input('stock', '0'); input('stock', '5'); fixture.detectChanges();
    expect(element.querySelector<HTMLInputElement>('#product-suspended')!.disabled).toBe(true);
    http.expectOne('/api/users/me/products/42').flush({}, { status: 500, statusText: 'Failure' });
    fixture.detectChanges();
    expect(form.controls['suspended'].enabled).toBe(true);
    expect(form.controls['suspended'].value).toBe(true);
    expect(form.dirty).toBe(true);
  });

  it('hides publication controls and excludes them from POST even if set programmatically', () => {
    const { element, input, form, submit } = setup();
    expect(element.querySelector('#product-suspended')).toBeNull();
    form.controls['suspended'].setValue(true);
    input('title', 'Created'); input('price', '1'); input('stock', '3');
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    submit();
    const pending = TestBed.inject(HttpTestingController).expectOne('/api/users/me/products');
    expect(pending.request.method).toBe('POST');
    expect(pending.request.body).toEqual({ title: 'Created', price: 1, stock: 3, description: '' });
    pending.flush({ ...product, statusCode: 'ACTIVE' });
  });

  it('populates exact text values pristine and untouched, keeping edit submission blocked', () => {
    const { fixture, form, submit, button } = editSetup('42');
    const create = vi.spyOn(TestBed.inject(ProductsService), 'create');
    expect(form.disabled).toBe(true);
    expect(fixture.componentInstance['loading']()).toBe(true);
    TestBed.inject(HttpTestingController).expectOne('/api/users/me/products/42').flush(product);
    fixture.detectChanges();
    expect(form.getRawValue()).toEqual({ title: 'Notebook', price: '12.345', description: '', stock: '3', suspended: false });
    expect(form.pristine).toBe(true);
    expect(form.untouched).toBe(true);
    expect(form.enabled).toBe(true);
    expect(fixture.componentInstance['loading']()).toBe(false);
    expect(button('Save changes').disabled).toBe(true);
    submit();
    expect(create).not.toHaveBeenCalled();
    form.markAsDirty();
    button('Cancel').click();
    expect(fixture.componentInstance['cancelConfirmationOpen']()).toBe(true);
  });

  it('enables valid dirty edits only after loading, blocks pending and duplicate submissions, and navigates on success', () => {
    const { fixture, input, submit, form, button } = editSetup('9007199254740993');
    const http = TestBed.inject(HttpTestingController);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const create = vi.spyOn(TestBed.inject(ProductsService), 'create');
    submit();
    http.expectOne('/api/users/me/products/9007199254740993').flush({ ...product, price: 12.34 });
    fixture.detectChanges();
    expect(button('Save changes').disabled).toBe(true);
    submit();
    http.expectNone(() => true);
    input('price', '12.345');
    fixture.detectChanges();
    expect(button('Save changes').disabled).toBe(true);
    submit();
    http.expectNone(() => true);
    input('price', '0012.50');
    fixture.detectChanges();
    expect(button('Save changes').disabled).toBe(false);
    form.markAsPending();
    fixture.detectChanges();
    expect(button('Save changes').disabled).toBe(true);
    submit();
    http.expectNone(() => true);
    form.updateValueAndValidity();
    const loader = TestBed.inject(BlockingLoaderService);
    const update = vi.spyOn(TestBed.inject(ProductsService), 'update');
    update.mockImplementation((id, request) => {
      expect(loader.visible()).toBe(true);
      return originalUpdate(id, request);
    });
    const originalUpdate = ProductsService.prototype.update.bind(TestBed.inject(ProductsService));
    submit(); submit();
    expect(button('Save changes').disabled).toBe(true);
    const request = http.expectOne('/api/users/me/products/9007199254740993');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ title: 'Notebook', price: 12.5, description: '', stock: 3, active: true });
    expect(TestBed.inject(NotificationService).current()).toBeNull();
    request.flush({ ...product, price: 12.5 });
    expect(TestBed.inject(NotificationService).current()).toMatchObject({
      status: 'success', message: 'Product updated successfully.',
    });
    expect(form.pristine).toBe(true);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/app/products']);
    expect(create).not.toHaveBeenCalled();
    expect(loader.visible()).toBe(false);
    expect(fixture.componentInstance['submitting']()).toBe(false);
  });

  it('preserves failed update values for retry and releases the loader on failure and cancellation', () => {
    const { fixture, input, submit, form, button } = editSetup('42');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/users/me/products/42').flush({ ...product, price: 12.34 });
    input('title', 'Changed'); input('price', '0012.50'); input('description', 'Keep me');
    const values = form.getRawValue();
    submit();
    http.expectOne('/api/users/me/products/42').flush({}, { status: 500, statusText: 'Failure' });
    fixture.detectChanges();
    expect(form.getRawValue()).toEqual(values);
    expect(form.dirty).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
    expect(TestBed.inject(NotificationService).current()).toMatchObject({
      status: 'error', message: 'Unable to update the product. Please try again.',
    });
    const loader = TestBed.inject(BlockingLoaderService);
    expect(loader.visible()).toBe(false);
    expect(button('Save changes').disabled).toBe(false);
    const releaseOther = loader.show();
    submit();
    const pending = http.expectOne('/api/users/me/products/42');
    fixture.destroy();
    expect(pending.cancelled).toBe(true);
    expect(fixture.componentInstance['submitting']()).toBe(false);
    expect(loader.visible()).toBe(true);
    releaseOther();
    expect(loader.visible()).toBe(false);
  });

  it('shows unavailable feedback and returns to Products after 404', () => {
    const { fixture, element, form, button } = editSetup('42');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    TestBed.inject(HttpTestingController).expectOne('/api/users/me/products/42').flush({}, { status: 404, statusText: 'Not found' });
    fixture.detectChanges();
    expect(element.textContent).toContain('This product is unavailable.');
    expect(form.disabled).toBe(true);
    expect(fixture.componentInstance['loading']()).toBe(false);
    expect(element.textContent).not.toContain('Retry');
    button('Back to Products').click();
    expect(navigate).toHaveBeenCalledWith(['/app/products']);
  });

  it.each([0, 500])('allows retry after load failure %s', status => {
    const { fixture, form, button } = editSetup('42');
    const http = TestBed.inject(HttpTestingController);
    const pending = http.expectOne('/api/users/me/products/42');
    if (status === 0) pending.error(new ProgressEvent('error'));
    else pending.flush({}, { status, statusText: 'Failure' });
    fixture.detectChanges();
    expect(form.disabled).toBe(true);
    expect(fixture.componentInstance['loading']()).toBe(false);
    button('Retry').click();
    expect(fixture.componentInstance['loading']()).toBe(true);
    http.expectOne('/api/users/me/products/42').flush(product);
    expect(form.enabled).toBe(true);
    expect(fixture.componentInstance['editError']()).toBeNull();
  });

  it('cancels stale requests on route changes and clears loading on destruction', () => {
    const { fixture, paramMap, form } = editSetup('42');
    const http = TestBed.inject(HttpTestingController);
    const old = http.expectOne('/api/users/me/products/42');
    paramMap.next(convertToParamMap({ id: '43' }));
    expect(old.cancelled).toBe(true);
    expect(fixture.componentInstance['loading']()).toBe(true);
    http.expectOne('/api/users/me/products/43').flush({ ...product, title: 'Current' });
    expect(form.getRawValue().title).toBe('Current');
    paramMap.next(convertToParamMap({ id: '44' }));
    const pending = http.expectOne('/api/users/me/products/44');
    fixture.destroy();
    expect(pending.cancelled).toBe(true);
    expect(fixture.componentInstance['loading']()).toBe(false);
  });

  it('does not request product data in create mode with a route ID', () => {
    const { form } = editSetup('42', 'create');
    expect(form.enabled).toBe(true);
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  it.each(['1', '9007199254740993', '9223372036854775807'])('loads valid ID %s and blocks pristine programmatic submission', id => {
    const { fixture, element, form, submit, button } = editSetup(id);
    const create = vi.spyOn(TestBed.inject(ProductsService), 'create');
    expect(fixture.componentInstance['mode']()).toBe('edit');
    expect(fixture.componentInstance['productId']()).toBe(id);
    expect(element.textContent).not.toContain('Saving changes is not available yet.');
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(form.disabled).toBe(true);
    expect(Array.from(element.querySelectorAll<HTMLInputElement>('input, textarea')).every(input => input.disabled)).toBe(true);
    expect(button('Save changes').disabled).toBe(true);
    TestBed.inject(HttpTestingController).expectOne(`/api/users/me/products/${id}`).flush(product);
    expect(form.enabled).toBe(true);
    // Even bypassing disabled controls must never turn edit submission into creation.
    form.enable();
    form.setValue({ title: 'Valid', price: '1', description: '', stock: '1', suspended: false });
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
    const pending = TestBed.inject(HttpTestingController).expectOne('/api/users/me/products/42');
    data.next({ mode: 'create' });
    expect(pending.cancelled).toBe(true);
    expect(form.enabled).toBe(true);
    expect(fixture.componentInstance['productId']()).toBeNull();
  });

  it('keeps Cancel navigation available in edit mode', () => {
    const { button } = editSetup('42');
    TestBed.inject(HttpTestingController).expectOne('/api/users/me/products/42').flush(product);
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
    expect(harness.routeNativeElement?.textContent).not.toContain('Saving changes is not available yet.');
    TestBed.inject(HttpTestingController).expectOne('/api/users/me/products/42').flush(product);
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
    expect(TestBed.inject(NotificationService).current()).toBeNull();
    request.flush({ id: 1 });
    expect(TestBed.inject(NotificationService).current()).toMatchObject({
      status: 'success', message: 'Product created successfully.',
    });
    expect(form.pristine).toBe(true);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/app/products']);
    expect(TestBed.inject(BlockingLoaderService).visible()).toBe(false);
    expect(form.getRawValue().price).toBe(price);
    expect(element.querySelectorAll('input, textarea').length).toBe(4);
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  it('prevents duplicates and preserves failed values for retry', () => {
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
    expect(TestBed.inject(NotificationService).current()).toMatchObject({
      status: 'error', message: 'Unable to create the product. Please try again.',
    });
    expect(TestBed.inject(BlockingLoaderService).visible()).toBe(false);
    expect(fixture.componentInstance['submitting']()).toBe(false);
    expect(button('Create product').disabled).toBe(false);
    submit();
    TestBed.inject(HttpTestingController).expectOne('/api/users/me/products').flush({ id: 1 });
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

  it.each(['create', 'edit'])('fetches exactly one fresh server page when returning after %s', async mode => {
    TestBed.inject(SessionService).establish({ accessToken: 'test', tokenType: 'Bearer', expiresIn: 900 });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create('/app/products');
    const listingUrl = '/api/users/me/products?page=0&pageSize=20';
    http.expectOne(listingUrl).flush([]);
    await harness.navigateByUrl(mode === 'edit' ? '/app/products/edit/42' : '/app/products/create');
    if (mode === 'edit') http.expectOne('/api/users/me/products/42').flush({ ...product, price: 12.34 });
    const element = harness.routeNativeElement!;
    for (const [field, value] of [['title', 'Fresh notebook'], ['price', '12.50'], ['stock', '3']]) {
      const input = element.querySelector<HTMLInputElement>(`#product-${field}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    element.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const created = { id: 1, title: 'Fresh notebook', price: 12.5, description: '', stock: 3, statusCode: 'ACTIVE' };
    const saved = http.expectOne(mode === 'edit' ? '/api/users/me/products/42' : '/api/users/me/products');
    expect(saved.request.method).toBe(mode === 'edit' ? 'PUT' : 'POST');
    const notifications = harness.routeDebugElement!.injector.get(NotificationService);
    expect(notifications.current()).toBeNull();
    saved.flush(created);
    await harness.fixture.whenStable();
    http.expectOne(listingUrl).flush([created]);
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/app/products');
    expect(harness.routeNativeElement?.textContent).toContain('Fresh notebook');
    expect(harness.routeDebugElement!.injector.get(NotificationService)).toBe(notifications);
    const notification = harness.routeNativeElement?.querySelector('[aria-label="Notification"]');
    expect(notification?.getAttribute('data-status')).toBe('success');
    expect(notification?.textContent).toContain(mode === 'edit'
      ? 'Product updated successfully.' : 'Product created successfully.');
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
