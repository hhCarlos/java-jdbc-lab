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
});
