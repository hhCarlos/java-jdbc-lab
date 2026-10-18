import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Login], providers: [provideRouter([])] }).compileComponents();
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

  it('keeps valid credentials local and provides the expected autocomplete and registration link', () => {
    const form = fixture.componentInstance['form'];
    const values = { email: 'person@example.com', password: ' password ' };
    form.setValue(values);
    submit();
    expect(form.valid).toBe(true);
    expect(form.getRawValue()).toEqual(values);
    expect(element.querySelector('.login__errors')).toBeNull();
    expect(element.querySelector('#login-email')?.getAttribute('autocomplete')).toBe('username');
    expect(element.querySelector('#login-password')?.getAttribute('autocomplete')).toBe('current-password');
    expect(element.querySelector('a')?.getAttribute('href')).toBe('/auth/register');
    expect(element.querySelector('button')?.textContent).toBe('Sign in');
  });
});
