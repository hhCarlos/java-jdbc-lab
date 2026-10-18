import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Register } from './register';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { Mock, vi } from 'vitest';
import { AuthService } from '../auth.service';
import { RegistrationResponse } from '../auth.models';
import { BlockingLoaderService } from '../../../shared/blocking-loader/blocking-loader.service';

describe('Register', () => {
  let fixture: ComponentFixture<Register>;
  let element: HTMLElement;
  let response: Subject<RegistrationResponse>;
  let loader: BlockingLoaderService;
  let navigate: Mock<Router['navigate']>;
  const register = vi.fn();
  const values = { name: 'María', lastname: 'Jean-Luc', email: 'person@example.com', password: ' aA1! ' };
  const publicUser: RegistrationResponse = {
    id: 42, name: values.name, lastname: values.lastname, email: values.email,
    createdAt: '2026-10-17T19:00:00-06:00', updatedAt: '2026-10-17T19:00:00-06:00',
  };

  beforeEach(async () => {
    response = new Subject<RegistrationResponse>();
    register.mockReset().mockReturnValue(response);
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideRouter([]), { provide: AuthService, useValue: { register } }],
    }).compileComponents();
    loader = TestBed.inject(BlockingLoaderService);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(Register);
    fixture.detectChanges();
    element = fixture.nativeElement;
  });

  function submit() {
    element.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  for (const field of ['name', 'lastname'] as const) {
    it(`requires a nonblank ${field}`, () => {
      const control = fixture.componentInstance['form'].controls[field];
      for (const value of ['', '   ', '\t\n', '\u00a0']) {
        control.setValue(value);
        expect(control.hasError('required')).toBe(true);
      }
    });

    it(`accepts accented and punctuated ${field} up to 50 characters`, () => {
      const control = fixture.componentInstance['form'].controls[field];
      for (const value of ['María José', "O’Connor", "D'Angelo", 'Jean-Luc', 'É'.repeat(50)]) {
        control.setValue(value);
        expect(control.valid).toBe(true);
      }
      control.setValue('É'.repeat(51));
      expect(control.hasError('maxlength')).toBe(true);
    });
  }

  it('requires a valid email', () => {
    const control = fixture.componentInstance['form'].controls.email;
    control.setValue('');
    expect(control.hasError('required')).toBe(true);
    control.setValue('not-an-email');
    expect(control.hasError('email')).toBe(true);
    control.setValue('person@example.com');
    expect(control.valid).toBe(true);
  });

  for (const [value, error] of [
    ['ABC1!', 'lowercase'], ['abc1!', 'uppercase'],
    ['Abc!', 'number'], ['Abc1', 'special'],
    ['Abc1 \t\n', 'special'],
  ]) {
    it(`rejects a password missing ${error}: ${JSON.stringify(value)}`, () => {
      const control = fixture.componentInstance['form'].controls.password;
      control.setValue(value);
      expect(control.errors).toEqual({ [error]: true });
    });
  }

  it('requires a password without adding a length rule or altering whitespace', () => {
    const control = fixture.componentInstance['form'].controls.password;
    expect(control.hasError('required')).toBe(true);
    for (const value of ['aA1!', ' aA1! ', 'éÉ1!']) {
      control.setValue(value);
      expect(control.valid).toBe(true);
      expect(control.value).toBe(value);
    }
  });

  it('reveals associated errors after touch, not initially', () => {
    expect(element.querySelector('.register__errors')).toBeNull();
    const input = element.querySelector<HTMLInputElement>('#register-name')!;
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('register-name-errors');
    expect(element.querySelector('#register-name-errors')?.textContent).toContain('This field is required.');
  });

  it('marks every field touched and focuses the first invalid field on submission', () => {
    const show = vi.spyOn(loader, 'show');
    const form = fixture.componentInstance['form'];
    form.controls.name.setValue('María');
    submit();
    expect(Object.values(form.controls).every(control => control.touched)).toBe(true);
    expect(document.activeElement).toBe(element.querySelector('#register-lastname'));
    expect(register).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
    expect(loader.visible()).toBe(false);
  });

  it('submits unchanged values and prevents duplicate submissions while pending', () => {
    const show = vi.spyOn(loader, 'show');
    register.mockImplementation(() => {
      expect(loader.visible()).toBe(true);
      return response;
    });
    fixture.componentInstance['form'].setValue(values);
    submit();
    submit();
    expect(register).toHaveBeenCalledExactlyOnceWith(values);
    expect(show).toHaveBeenCalledTimes(1);
    expect(loader.visible()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
    expect(element.querySelector('button')?.disabled).toBe(true);
    expect(element.querySelector('button')?.textContent).toBe('Creating account...');
    expect(element.querySelector('[role="status"]')?.textContent).toBe('Creating account...');
    response.complete();
    expect(loader.visible()).toBe(false);
    fixture.detectChanges();
    expect(element.querySelector('button')?.disabled).toBe(false);
    expect(element.querySelector('button')?.textContent).toBe('Create account');
  });

  it('confirms success accessibly, clears only the password, and navigates to sign in', () => {
    const form = fixture.componentInstance['form'];
    form.setValue(values);
    submit();
    response.next(publicUser);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/auth/login']);
    response.complete();
    expect(loader.visible()).toBe(false);
    fixture.detectChanges();
    expect(form.getRawValue()).toEqual({ ...values, password: '' });
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Your account has been created.');
    expect(element.querySelector('[role="status"]')?.getAttribute('aria-live')).toBe('polite');
    expect(element.querySelector('.register__errors')).toBeNull();
    expect(element.querySelector('a')?.getAttribute('href')).toBe('/auth/login');
    expect(element.querySelector('button')?.disabled).toBe(false);
  });

  for (const [status, message] of [
    [400, 'Some registration details were rejected.'],
    [409, 'This email is already registered.'],
    [0, 'Unable to connect to the server.'],
    [500, 'Unable to create your account. Please try again.'],
  ] as const) {
    it(`handles HTTP ${status} safely and allows a successful retry`, () => {
      const form = fixture.componentInstance['form'];
      form.setValue(values);
      submit();
      response.error(new HttpErrorResponse({ status, error: { detail: 'private internal details' } }));
      expect(loader.visible()).toBe(false);
      expect(navigate).not.toHaveBeenCalled();
      fixture.detectChanges();
      expect(element.querySelector('[role="status"]')?.textContent).toContain(message);
      expect(element.textContent).not.toContain('private internal details');
      expect(form.getRawValue()).toEqual(values);
      expect(element.querySelector('button')?.disabled).toBe(false);
      expect(element.querySelector('button')?.textContent).toBe('Create account');
      response = new Subject<RegistrationResponse>();
      register.mockReturnValue(response);
      submit();
      expect(register).toHaveBeenCalledTimes(2);
      expect(loader.visible()).toBe(true);
      response.next(publicUser);
      expect(navigate).toHaveBeenCalledExactlyOnceWith(['/auth/login']);
      response.complete();
      expect(loader.visible()).toBe(false);
      fixture.detectChanges();
      expect(element.textContent).toContain('Your account has been created.');
    });
  }

  it('uses safe feedback for a non-HTTP error', () => {
    fixture.componentInstance['form'].setValue(values);
    submit();
    response.error(new Error('private internal details'));
    expect(navigate).not.toHaveBeenCalled();
    expect(loader.visible()).toBe(false);
    fixture.detectChanges();
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Unable to create your account. Please try again.');
    expect(element.textContent).not.toContain('private internal details');
  });

  it('unsubscribes from a pending request on destruction', () => {
    fixture.componentInstance['form'].setValue(values);
    submit();
    expect(response.observed).toBe(true);
    expect(loader.visible()).toBe(true);
    fixture.destroy();
    expect(navigate).not.toHaveBeenCalled();
    expect(loader.visible()).toBe(false);
    expect(response.observed).toBe(false);
    expect(fixture.componentInstance['submitting']()).toBe(false);
  });

  it('releases only the registration loader handle when destroyed', () => {
    const releaseOther = loader.show();
    fixture.componentInstance['form'].setValue(values);
    submit();
    fixture.destroy();
    expect(response.observed).toBe(false);
    expect(loader.visible()).toBe(true);
    releaseOther();
    expect(loader.visible()).toBe(false);
  });

  for (const theme of ['light', 'dark']) {
    describe(`password checklist in ${theme} theme`, () => {
      beforeEach(() => document.documentElement.dataset['theme'] = theme);
      afterEach(() => document.documentElement.removeAttribute('data-theme'));

      it('appears only on focus and preserves errors on blur', () => {
        const input = element.querySelector<HTMLInputElement>('#register-password')!;
        expect(element.querySelector('#register-password-checklist')).toBeNull();
        input.focus();
        fixture.detectChanges();
        const checklist = element.querySelector('#register-password-checklist')!;
        expect(checklist.querySelectorAll('li')).toHaveLength(4);
        expect(checklist.querySelectorAll('button, input, [tabindex], [role="checkbox"]')).toHaveLength(0);
        expect(input.getAttribute('aria-describedby')).toContain('register-password-checklist');
        input.blur();
        fixture.detectChanges();
        expect(element.querySelector('#register-password-checklist')).toBeNull();
        expect(input.getAttribute('aria-describedby')).toBe('register-password-hint register-password-errors');
        expect(element.querySelector('#register-password-errors')?.textContent).toContain('This field is required.');
      });

      for (const [value, missing] of [
        ['', ['lowercase', 'uppercase', 'number', 'special']],
        ['ABC1!', ['lowercase']], ['abc1!', ['uppercase']],
        ['Abc!', ['number']], ['Abc1 ', ['special']], [' aA1! ', []],
      ] as const) {
        it(`updates indicators for ${JSON.stringify(value)} without altering the password`, () => {
          const input = element.querySelector<HTMLInputElement>('#register-password')!;
          input.focus();
          input.value = value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          fixture.detectChanges();
          const items = element.querySelectorAll('#register-password-checklist li');
          ['lowercase', 'uppercase', 'number', 'special'].forEach((key, index) => {
            const satisfied = !(missing as readonly string[]).includes(key);
            expect(items[index].classList.contains('register__requirement--satisfied')).toBe(satisfied);
            expect(items[index].querySelector('.register__requirement-icon')?.textContent).toBe(satisfied ? '✓' : '');
            expect(items[index].querySelector('.u-visually-hidden')?.textContent).toBe(satisfied ? 'Satisfied: ' : 'Not satisfied: ');
          });
          expect(fixture.componentInstance['form'].controls.password.value).toBe(value);
        });
      }

      it('reverts indicators when characters are deleted', () => {
        const input = element.querySelector<HTMLInputElement>('#register-password')!;
        input.focus();
        for (const value of ['aA1!', 'a']) {
          input.value = value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          fixture.detectChanges();
        }
        expect(element.querySelectorAll('.register__requirement--satisfied')).toHaveLength(1);
        expect(element.querySelector('.register__requirement--satisfied')?.textContent).toContain('lowercase');
      });
    });
  }

});
