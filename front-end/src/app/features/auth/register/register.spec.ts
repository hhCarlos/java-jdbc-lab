import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Register } from './register';

describe('Register', () => {
  let fixture: ComponentFixture<Register>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideRouter([])],
    }).compileComponents();
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
    const form = fixture.componentInstance['form'];
    form.controls.name.setValue('María');
    submit();
    expect(Object.values(form.controls).every(control => control.touched)).toBe(true);
    expect(document.activeElement).toBe(element.querySelector('#register-lastname'));
  });

  it('keeps a valid submission local with the password unchanged', () => {
    const form = fixture.componentInstance['form'];
    const values = { name: 'María', lastname: 'Jean-Luc', email: 'person@example.com', password: ' aA1! ' };
    form.setValue(values);
    submit();
    expect(form.valid).toBe(true);
    expect(form.getRawValue()).toEqual(values);
    expect(element.querySelector('.register__errors')).toBeNull();
    expect(element.querySelector('button')?.textContent).toBe('Create account');
    expect(element.querySelector('a')?.getAttribute('href')).toBe('/auth/login');
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
