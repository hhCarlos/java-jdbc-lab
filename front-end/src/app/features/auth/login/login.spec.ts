import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../auth.service';
import { LoginResponse } from '../auth.models';
import { SessionService } from '../session.service';
import { BlockingLoaderService } from '../../../shared/blocking-loader/blocking-loader.service';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let element: HTMLElement;
  let response: Subject<LoginResponse>;
  let login: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    response = new Subject<LoginResponse>();
    login = vi.fn(() => response);
    await TestBed.configureTestingModule({ imports: [Login], providers: [
      provideRouter([]), { provide: AuthService, useValue: { login } },
    ] }).compileComponents();
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    element = fixture.nativeElement;
  });

  function submit() {
    element.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  it('requires an Angular-valid email and a nonempty password', () => {
    const { email, password } = fixture.componentInstance['form'].controls;
    expect(email.hasError('required')).toBe(true);
    expect(password.hasError('required')).toBe(true);
    email.setValue('not-an-email');
    expect(email.hasError('email')).toBe(true);
    email.setValue('person@example.com');
    expect(email.valid).toBe(true);
  });

  it('preserves passwords without registration complexity rules or trimming', () => {
    const control = fixture.componentInstance['form'].controls.password;
    for (const value of ['a', '123', ' ', ' password ']) {
      control.setValue(value);
      expect(control.valid).toBe(true);
      expect(control.value).toBe(value);
    }
  });

  it('shows associated errors after touch, not initially', () => {
    expect(element.querySelector('.login__errors')).toBeNull();
    const input = element.querySelector<HTMLInputElement>('#login-email')!;
    input.value = 'invalid';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('login-email-errors');
    expect(element.querySelector('#login-email-errors')?.textContent).toBe('Enter a valid email address.');
  });

  it('touches all fields and focuses the first invalid field on submission', () => {
    const form = fixture.componentInstance['form'];
    submit();
    expect(Object.values(form.controls).every(control => control.touched)).toBe(true);
    expect(document.activeElement).toBe(element.querySelector('#login-email'));
    form.controls.email.setValue('person@example.com');
    submit();
    expect(document.activeElement).toBe(element.querySelector('#login-password'));
  });

  it('submits unchanged credentials and preserves autocomplete and registration link', () => {
    const form = fixture.componentInstance['form'];
    const values = { email: 'person@example.com', password: ' password ' };
    form.setValue(values);
    submit();
    expect(form.valid).toBe(true);
    expect(form.getRawValue()).toEqual(values);
    expect(login).toHaveBeenCalledWith(values);
    expect(element.querySelector('.login__errors')).toBeNull();
    expect(element.querySelector('#login-email')?.getAttribute('autocomplete')).toBe('username');
    expect(element.querySelector('#login-password')?.getAttribute('autocomplete')).toBe('current-password');
    expect(element.querySelector('a')?.getAttribute('href')).toBe('/auth/register');
    expect(element.querySelector('button')?.textContent).toBe('Sign in');
  });

  it('does not submit invalid forms or show the loader', () => {
    submit();
    expect(login).not.toHaveBeenCalled();
    expect(TestBed.inject(BlockingLoaderService).visible()).toBe(false);
  });

  function submitValid() {
    fixture.componentInstance['form'].setValue({ email: 'person@example.test', password: ' password ' });
    submit();
  }

  it('establishes the session, clears the password, navigates and releases the loader', () => {
    submitValid();
    expect(TestBed.inject(BlockingLoaderService).visible()).toBe(true);
    expect(element.querySelector('button')?.disabled).toBe(true);
    response.next({ accessToken: 'test-token', tokenType: 'Bearer', expiresIn: 900 });
    response.complete();
    expect(TestBed.inject(SessionService).getAccessToken()).toBe('test-token');
    expect(fixture.componentInstance['form'].controls.password.value).toBe('');
    expect(navigate).toHaveBeenCalledWith(['/app/products']);
    expect(TestBed.inject(BlockingLoaderService).visible()).toBe(false);
    expect(fixture.componentInstance['submitting']()).toBe(false);
  });

  for (const [status, message] of [
    [401, 'Invalid email or password. Please try again.'],
    [0, 'Unable to connect to the server. Check your connection and try again.'],
    [500, 'Unable to sign in. Please try again.'],
  ] as const) {
    it(`shows accessible feedback for ${status}, stays on the page, and releases the loader`, () => {
      submitValid();
      response.error(new HttpErrorResponse({ status }));
      fixture.detectChanges();
      expect(element.querySelector('[role="alert"]')?.textContent).toContain(message);
      expect(navigate).not.toHaveBeenCalled();
      expect(TestBed.inject(SessionService).isAuthenticated()).toBe(false);
      expect(TestBed.inject(BlockingLoaderService).visible()).toBe(false);
      expect(fixture.componentInstance['submitting']()).toBe(false);
    });
  }

  it('prevents duplicate submissions while pending', () => {
    submitValid();
    submit();
    expect(login).toHaveBeenCalledTimes(1);
  });

  it('cancels and releases the loader on destruction', () => {
    submitValid();
    fixture.destroy();
    expect(response.observed).toBe(false);
    expect(TestBed.inject(BlockingLoaderService).visible()).toBe(false);
    expect(fixture.componentInstance['submitting']()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});
