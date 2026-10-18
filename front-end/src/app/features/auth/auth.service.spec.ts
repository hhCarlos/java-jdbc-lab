import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { RegisterRequest, RegistrationResponse } from './auth.models';
import { AuthService } from './auth.service';

describe('AuthService registration', () => {
  let service: AuthService;
  let http: HttpTestingController;
  const request: RegisterRequest = {
    name: 'Ana',
    lastname: 'Lopez',
    email: 'ana@example.test',
    password: ' aA1! ',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('waits for subscription, posts the unchanged body, and returns the public user', async () => {
    const result = service.register(request);
    http.expectNone('/api/auth/register');
    const responsePromise = firstValueFrom(result);
    const pending = http.expectOne('/api/auth/register');
    expect(pending.request.method).toBe('POST');
    expect(pending.request.body).toEqual(request);
    expect(pending.request.body.password).toBe(' aA1! ');

    const response: RegistrationResponse = {
      id: 42,
      name: 'Ana',
      lastname: 'Lopez',
      email: 'ana@example.test',
      createdAt: '2026-10-17T19:00:00-06:00',
      updatedAt: '2026-10-17T19:00:00-06:00',
    };
    pending.flush(response, {
      status: 201,
      statusText: 'Created',
      headers: { Location: 'http://localhost:8080/users/42' },
    });
    expect(await responsePromise).toEqual(response);
  });

  for (const status of [400, 409, 500]) {
    it(`propagates the HTTP ${status} error and its body`, async () => {
      const responsePromise = firstValueFrom(service.register(request));
      const errorPromise = responsePromise.catch((error: HttpErrorResponse) => error);
      const problem = { title: 'Registration failed', status, detail: 'Request rejected' };
      http.expectOne('/api/auth/register').flush(problem, { status, statusText: 'Error' });

      const error = await errorPromise;
      expect(error).toBeInstanceOf(HttpErrorResponse);
      expect((error as HttpErrorResponse).status).toBe(status);
      expect((error as HttpErrorResponse).error).toEqual(problem);
    });
  }
});
