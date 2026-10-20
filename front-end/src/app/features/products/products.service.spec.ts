import { HttpErrorResponse, HttpParams, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { authInterceptor } from '../auth/auth.interceptor';
import { SessionService } from '../auth/session.service';
import { OwnedProduct, ProductPagination } from './products.models';
import { ProductsService } from './products.service';

const endpoint = '/api/users/me/products';

describe('ProductsService', () => {
  let service: ProductsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: SessionService, useValue: { getAccessToken: () => 'test-token', clear: vi.fn() } },
        { provide: Router, useValue: { url: '/app/products', navigate: vi.fn().mockResolvedValue(true) } },
      ],
    });
    service = TestBed.inject(ProductsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GETs lazily using the exact ID and interceptor authentication', async () => {
    const result = service.getById('9007199254740993');
    http.expectNone(() => true);
    const promise = firstValueFrom(result);
    const pending = http.expectOne(`${endpoint}/9007199254740993`);
    expect(pending.request.method).toBe('GET');
    expect(pending.request.body).toBeNull();
    expect(pending.request.headers.get('Authorization')).toBe('Bearer test-token');
    const product: OwnedProduct = { id: 42, title: 'Book', price: 12.34, description: null, stock: 0, statusCode: 'ACTIVE' };
    pending.flush(product);
    expect(await promise).toEqual(product);
  });

  it.each([404, 401, 500])('preserves detail HTTP %s errors and session expiry', async status => {
    const result = firstValueFrom(service.getById('42')).catch((error: unknown) => error);
    const problem = { detail: 'Failure' };
    http.expectOne(`${endpoint}/42`).flush(problem, { status, statusText: 'Error' });
    const error = await result as HttpErrorResponse;
    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect(error.status).toBe(status);
    expect(error.error).toEqual(problem);
    expect(TestBed.inject(SessionService).clear).toHaveBeenCalledTimes(status === 401 ? 1 : 0);
    if (status === 401) expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/auth/login'], { replaceUrl: true });
  });

  it('POSTs lazily with only editable fields, interceptor auth, and returns the created product', async () => {
    const input = {
      title: 'Book', price: 9999999999.99, stock: 9999999999, description: 'Details',
      ownerUserId: 999, statusCode: 'DELETED',
    };
    const result = service.create(input);
    http.expectNone(endpoint);
    const promise = firstValueFrom(result);
    const pending = http.expectOne(endpoint);
    expect(pending.request.method).toBe('POST');
    expect(pending.request.params.keys()).toEqual([]);
    expect(pending.request.headers.get('Authorization')).toBe('Bearer test-token');
    expect(pending.request.body).toEqual({
      title: 'Book', price: 9999999999.99, stock: 9999999999, description: 'Details',
    });
    const response: OwnedProduct = {
      id: 42, title: 'Book', price: input.price, stock: input.stock,
      description: 'Details', statusCode: 'ACTIVE',
    };
    pending.flush(response, { status: 201, statusText: 'Created' });
    expect(await promise).toEqual(response);
  });

  it.each([undefined, null, ''])('supports zero stock and optional description %j', async description => {
    const input = { title: 'Zero', price: 0, stock: 0, description };
    const promise = firstValueFrom(service.create(input));
    const pending = http.expectOne(endpoint);
    expect(pending.request.body).toEqual(description === undefined
      ? { title: 'Zero', price: 0, stock: 0 } : input);
    const response: OwnedProduct = {
      id: 43, ...input, description: description ?? null, statusCode: 'INACTIVE',
    };
    pending.flush(response, { status: 201, statusText: 'Created' });
    expect(await promise).toEqual(response);
  });

  it.each([400, 401, 500])('preserves creation HTTP %s problem details without numeric conversion', async status => {
    const result = firstValueFrom(service.create({ title: 'Book', price: 12.345, stock: 1.5 }))
      .catch((error: unknown) => error);
    const pending = http.expectOne(endpoint);
    expect(pending.request.body).toEqual({ title: 'Book', price: 12.345, stock: 1.5 });
    const problem = { type: 'about:blank', title: 'Request failed', status, detail: 'Backend problem details' };
    pending.flush(problem, { status, statusText: 'Error' });
    const error = await result;
    expect(error).toBeInstanceOf(HttpErrorResponse);
    if (!(error instanceof HttpErrorResponse)) throw new Error('Expected HTTP error');
    expect(error.status).toBe(status);
    expect(error.error).toEqual(problem);
    expect(error.url).toBe(endpoint);
  });

  it('supports omitted description and preserves creation network errors', async () => {
    const result = firstValueFrom(service.create({ title: 'Book', price: 12.34, stock: 1 }))
      .catch((error: unknown) => error);
    const pending = http.expectOne(endpoint);
    expect(pending.request.body).toEqual({ title: 'Book', price: 12.34, stock: 1 });
    const event = new ProgressEvent('error');
    pending.error(event);
    const error = await result;
    expect(error).toBeInstanceOf(HttpErrorResponse);
    if (!(error instanceof HttpErrorResponse)) throw new Error('Expected HTTP error');
    expect(error.status).toBe(0);
    expect(error.error).toBe(event);
  });

  it('waits for subscription and GETs the proxy URL with default pagination and interceptor auth', async () => {
    const result = service.listMine();
    http.expectNone(request => request.url === endpoint);
    const promise = firstValueFrom(result);
    const pending = http.expectOne(`${endpoint}?page=0&pageSize=20`);
    expect(pending.request.method).toBe('GET');
    expect(pending.request.body).toBeNull();
    expect(pending.request.params).toBeInstanceOf(HttpParams);
    expect(pending.request.params.keys()).toEqual(['page', 'pageSize']);
    expect(pending.request.headers.get('Authorization')).toBe('Bearer test-token');
    pending.flush([]);
    expect(await promise).toEqual([]);
  });

  it.each([
    [{ page: 3, pageSize: 7 }, '3', '7'],
    [{ page: 2 }, '2', '20'],
    [{ pageSize: 1 }, '0', '1'],
    [{ page: 2_147_483_647, pageSize: 100 }, '2147483647', '100'],
  ] satisfies [ProductPagination, string, string][])
    ('sends supported pagination %j', async (pagination, page, pageSize) => {
      const promise = firstValueFrom(service.listMine(pagination));
      const pending = http.expectOne(request => request.url === endpoint);
      expect(pending.request.params.get('page')).toBe(page);
      expect(pending.request.params.get('pageSize')).toBe(pageSize);
      pending.flush([]);
      expect(await promise).toEqual([]);
    });

  it('returns the backend array unchanged, including inactive, zero-stock, and nullable values', async () => {
    const response: OwnedProduct[] = [
      { id: 4, title: 'Zero', price: 0, description: null, stock: 0, statusCode: 'INACTIVE' },
      { id: 8, title: 'Available', price: 12.34, description: 'Description', stock: 5, statusCode: 'ACTIVE' },
    ];
    const promise = firstValueFrom(service.listMine());
    http.expectOne(request => request.url === endpoint).flush(response);
    expect(await promise).toEqual(response);
  });

  it('returns an empty array for an empty or out-of-range page', async () => {
    const promise = firstValueFrom(service.listMine({ page: 99 }));
    http.expectOne(`${endpoint}?page=99&pageSize=20`).flush([]);
    expect(await promise).toEqual([]);
  });

  const invalidPagination: ProductPagination[] = [
    ...[-1, 0.5, NaN, Infinity, -Infinity, 2_147_483_648, Number.MAX_SAFE_INTEGER]
      .map(page => ({ page })),
    ...[0, -1, 101, 1.5, NaN, Infinity, -Infinity]
      .map(pageSize => ({ pageSize })),
  ];
  it.each(invalidPagination)('rejects unsupported pagination %j without HTTP', async pagination => {
    await expect(firstValueFrom(service.listMine(pagination))).rejects.toBeInstanceOf(RangeError);
    http.expectNone(request => request.url === endpoint);
  });

  it.each([400, 401, 500])('preserves HTTP %s and its problem details for the caller', async status => {
    const result = firstValueFrom(service.listMine()).catch((error: unknown) => error);
    const problem = { title: 'Request failed', status, detail: 'Backend problem details' };
    http.expectOne(request => request.url === endpoint)
      .flush(problem, { status, statusText: 'Error' });
    const error = await result;
    expect(error).toBeInstanceOf(HttpErrorResponse);
    if (!(error instanceof HttpErrorResponse)) throw new Error('Expected HTTP error');
    expect(error.status).toBe(status);
    expect(error.error).toEqual(problem);
    expect(error.url).toBe(`${endpoint}?page=0&pageSize=20`);
  });

  it('preserves network errors', async () => {
    const result = firstValueFrom(service.listMine()).catch((error: unknown) => error);
    const event = new ProgressEvent('error');
    http.expectOne(request => request.url === endpoint).error(event);
    const error = await result;
    expect(error).toBeInstanceOf(HttpErrorResponse);
    if (!(error instanceof HttpErrorResponse)) throw new Error('Expected HTTP error');
    expect(error.status).toBe(0);
    expect(error.error).toBe(event);
  });
});
