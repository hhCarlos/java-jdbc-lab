import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { OwnedProduct } from './products.models';
import { Products } from './products';

function product(id: number, statusCode = 'ACTIVE'): OwnedProduct {
  return { id, title: `Item ${id}`, price: 12.5, description: null, stock: 0, statusCode };
}

const url = (page: number) => `/api/users/me/products?page=${page}&pageSize=20`;

describe('Products page', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function setup() {
    const fixture = TestBed.createComponent(Products);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const button = (label: string): HTMLButtonElement => {
      const match = Array.from(element.querySelectorAll<HTMLButtonElement>('button'))
        .find(button => button.textContent?.trim() === label);
      if (!match) throw new Error(`Missing button ${label}`);
      return match;
    };
    return { fixture, element, button };
  }

  it('navigates to creation from the shared button', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const { button } = setup();
    http.expectOne(url(0)).flush([]);
    button('New product').click();
    expect(navigate).toHaveBeenCalledWith(['/app/products/create']);
  });

  it('navigates to the selected product from its shared Edit action', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const { fixture, element } = setup();
    http.expectOne(url(0)).flush([product(12), product(34)]);
    fixture.detectChanges();
    const actions = element.querySelectorAll<HTMLButtonElement>('tbody app-button button');
    expect(actions).toHaveLength(2);
    expect(element.querySelector('tbody app-icon')).not.toBeNull();
    actions[1].click();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/app/products/edit', 34]);
  });

  it('loads on opening and shows inline loading without empty or error content', () => {
    const { element, button } = setup();
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Loading products');
    expect(element.querySelector('section')?.getAttribute('aria-busy')).toBe('true');
    expect(element.querySelector('app-table')).toBeNull();
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(button('Previous').disabled).toBe(true);
    expect(button('Next').disabled).toBe(true);
    http.expectOne(url(0)).flush([]);
  });

  it('renders shared table columns, decimal prices, zero stock, and English statuses without changing codes', () => {
    const { fixture, element } = setup();
    const rows = [product(1), product(2, 'INACTIVE'), product(3, 'NEW_CODE')];
    rows[1].price = 0;
    http.expectOne(url(0)).flush(rows);
    fixture.detectChanges();
    expect(Array.from(element.querySelectorAll('th'), header => header.textContent?.trim()))
      .toEqual(['ID', 'Title', 'Price', 'Stock', 'Status', 'Actions']);
    const cells = Array.from(element.querySelectorAll('tbody tr'), row =>
      Array.from(row.querySelectorAll('td'), cell => cell.textContent?.trim()));
    expect(cells).toEqual([
      ['1', 'Item 1', '12.50', '0', 'Active', 'Edit'],
      ['2', 'Item 2', '0.00', '0', 'Inactive', 'Edit'],
      ['3', 'Item 3', '12.50', '0', 'Unknown status', 'Edit'],
    ]);
    expect(rows[1].statusCode).toBe('INACTIVE');
    expect(element.querySelector('h1')).toBeNull();
    expect(element.querySelector('[role="status"]')).toBeNull();
    expect(element.querySelector('section')?.getAttribute('aria-busy')).toBe('false');
  });

  it('renders the empty state and disables Next for an empty first page', () => {
    const { fixture, element, button } = setup();
    http.expectOne(url(0)).flush([]);
    fixture.detectChanges();
    const empty = element.querySelector('tbody td')!;
    expect(empty.textContent?.trim()).toBe('No products yet.');
    expect(empty.getAttribute('colspan')).toBe('6');
    expect(button('Next').disabled).toBe(true);
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows an error separately and retries the same page', () => {
    const { fixture, element, button } = setup();
    http.expectOne(url(0)).flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Unable to load products.');
    expect(element.querySelector('app-table')).toBeNull();
    button('Retry').click();
    fixture.detectChanges();
    expect(element.querySelector('[role="status"]')).not.toBeNull();
    http.expectOne(url(0)).flush([product(1)]);
    fixture.detectChanges();
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(element.querySelector('tbody')?.textContent).toContain('Item 1');
  });

  it('offers retry for a network failure', () => {
    const { fixture, button } = setup();
    http.expectOne(url(0)).error(new ProgressEvent('error'));
    fixture.detectChanges();
    button('Retry').click();
    http.expectOne(url(0)).flush([]);
  });

  it.each([401, 403])('does not offer retry for HTTP %s', status => {
    const { fixture, element } = setup();
    http.expectOne(url(0)).flush({}, { status, statusText: 'Denied' });
    fixture.detectChanges();
    expect(element.querySelector('[role="alert"]')).not.toBeNull();
    expect(element.textContent).not.toContain('Retry');
  });

  it('requests server pages, disables Next on partial pages, and returns with Previous', () => {
    const { fixture, element, button } = setup();
    http.expectOne(url(0)).flush(Array.from({ length: 20 }, (_, index) => product(index + 1)));
    fixture.detectChanges();
    expect(button('Next').disabled).toBe(false);
    button('Next').click();
    fixture.detectChanges();
    expect(button('Next').disabled).toBe(true);
    http.expectOne(url(1)).flush([product(21)]);
    fixture.detectChanges();
    expect(element.textContent).toContain('Page 2');
    expect(button('Next').disabled).toBe(true);
    button('Previous').click();
    http.expectOne(url(0)).flush([product(1)]);
    fixture.detectChanges();
    expect(element.textContent).toContain('Page 1');
    expect(button('Previous').disabled).toBe(true);
  });

  it('allows returning from an empty page after a full final page', () => {
    const { fixture, element, button } = setup();
    http.expectOne(url(0)).flush(Array.from({ length: 20 }, (_, index) => product(index)));
    fixture.detectChanges();
    button('Next').click();
    http.expectOne(url(1)).flush([]);
    fixture.detectChanges();
    expect(element.textContent).toContain('No products on this page.');
    expect(button('Previous').disabled).toBe(false);
    expect(button('Next').disabled).toBe(true);
  });

  it('cancels superseded requests so stale pagination cannot replace newer results', () => {
    const { fixture, element, button } = setup();
    http.expectOne(url(0)).flush(Array.from({ length: 20 }, (_, index) => product(index)));
    fixture.detectChanges();
    button('Next').click();
    fixture.detectChanges();
    const oldRequest = http.expectOne(url(1));
    button('Previous').click();
    expect(oldRequest.cancelled).toBe(true);
    http.expectOne(url(0)).flush([product(100)]);
    fixture.detectChanges();
    expect(element.querySelector('tbody')?.textContent).toContain('Item 100');
    expect(element.textContent).toContain('Page 1');
  });

  it('cancels pending HTTP when the page is destroyed', () => {
    const { fixture } = setup();
    const pending = http.expectOne(url(0));
    fixture.destroy();
    expect(pending.cancelled).toBe(true);
  });
});
