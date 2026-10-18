import { HttpClient, HttpHeaders, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { SessionService } from './session.service';

describe('authInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let session: SessionService;
  let navigate: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
      provideRouter([]),
    ] });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionService);
    Object.defineProperty(TestBed.inject(Router), 'url', { configurable: true, get: () => '/app/products' });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    session.establish({ accessToken: 'test-token', tokenType: 'Bearer', expiresIn: 900 });
  });
  afterEach(() => http.verify());

  it('clears the matching session, redirects once for concurrent 401s, and preserves errors', () => {
    const errors: unknown[] = [];
    client.get('/api/users/me').subscribe({ error: error => errors.push(error) });
    client.get('/api/users/me/products').subscribe({ error: error => errors.push(error) });
    const body = { title: 'Unauthorized' };
    http.expectOne('/api/users/me').flush(body, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/api/users/me/products').flush(body, { status: 401, statusText: 'Unauthorized' });
    expect(session.getAccessToken()).toBeNull();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/auth/login'], { replaceUrl: true });
    expect(errors).toHaveLength(2);
    expect((errors[0] as { error: unknown }).error).toEqual(body);
  });

  it('does not clear a newer session after a delayed old-token 401', () => {
    client.get('/api/users/me').subscribe({ error: () => {} });
    session.establish({ accessToken: 'new-token', tokenType: 'Bearer', expiresIn: 900 });
    http.expectOne('/api/users/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(session.getAccessToken()).toBe('new-token');
    expect(navigate).not.toHaveBeenCalled();
  });

  for (const [url, status] of [
    ['/api/auth/login', 401], ['/api/auth/register', 401],
    ['/api/catalog/products', 401], ['/api/unknown-public', 401],
    ['https://external.test/api/users/me', 401], ['/api/users/me', 403],
  ] as const) {
    it(`does not invalidate the session for ${status} from ${url}`, () => {
      client.get(url).subscribe({ error: () => {} });
      http.expectOne(url).flush({}, { status, statusText: 'Rejected' });
      expect(session.getAccessToken()).toBe('test-token');
      expect(navigate).not.toHaveBeenCalled();
    });
  }

  it('does not redirect a request sent without a token', () => {
    session.clear();
    client.get('/api/users/me').subscribe({ error: () => {} });
    http.expectOne('/api/users/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('clears a rejected session without redirecting when already on the login page', () => {
    Object.defineProperty(TestBed.inject(Router), 'url', { configurable: true, get: () => '/auth/login' });
    client.get('/api/users/me').subscribe({ error: () => {} });
    http.expectOne('/api/users/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(session.getAccessToken()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  for (const url of ['/api/products', '/api/products?limit=5', '/api/auth/login-history']) {
    it(`attaches a bearer token to ${url} and preserves other headers`, () => {
      client.get(url, { headers: new HttpHeaders({ 'X-Request-ID': '123' }) }).subscribe();
      const pending = http.expectOne(url);
      expect(pending.request.headers.get('Authorization')).toBe('Bearer test-token');
      expect(pending.request.headers.get('X-Request-ID')).toBe('123');
      pending.flush({});
    });
  }

  for (const url of [
    '/api/auth/login', '/api/auth/login?attempt=1', '/api/auth/register',
    '/api/auth/register/', '/api/products/../auth/login',
    'https://external.test/api/products', '//external.test/api/products',
    'http://localhost:8080/api/products', '/api-other/products', '/api',
    'api/products', '/products', '/api/../outside', '/api/\\external.test',
  ]) {
    it(`leaves ${url} unchanged`, () => {
      client.get(url, { headers: { 'X-Request-ID': '123' } }).subscribe();
      const pending = http.expectOne(url);
      expect(pending.request.headers.has('Authorization')).toBe(false);
      expect(pending.request.headers.get('X-Request-ID')).toBe('123');
      pending.flush({});
    });
  }

  for (const state of ['absent', 'expired'] as const) {
    it(`leaves headers unchanged with an ${state} token`, () => {
      if (state === 'absent') session.clear();
      else session.establish({ accessToken: 'expired', tokenType: 'Bearer', expiresIn: 0 });
      client.get('/api/products', { headers: { Authorization: 'Existing value' } }).subscribe();
      const pending = http.expectOne('/api/products');
      expect(pending.request.headers.get('Authorization')).toBe('Existing value');
      pending.flush({});
    });
  }
});
