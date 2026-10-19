import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
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
  afterEach(() => TestBed.inject(HttpTestingController).verify());

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
      element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
      fixture.detectChanges();
    };
    return { element, input, submit };
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
    expect(navigate).toHaveBeenCalledWith(['/app/products']);
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
