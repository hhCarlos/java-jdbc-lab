import { HttpClient, HttpHeaders, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { authInterceptor } from './auth.interceptor';
import { SessionService } from './session.service';

describe('authInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let session: SessionService;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
    ] });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionService);
    session.establish({ accessToken: 'test-token', tokenType: 'Bearer', expiresIn: 900 });
  });
  afterEach(() => http.verify());

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
