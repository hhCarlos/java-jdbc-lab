import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { AppInput } from './app-input';

@Component({
  imports: [AppInput, ReactiveFormsModule],
  template: `<form [formGroup]="form">
    <app-input label="Example" inputId="example" formControlName="value"
      [type]="type" [minLength]="minLength" [maxLength]="maxLength" [pattern]="pattern"
      [min]="min" [max]="max" [step]="step" [showCounter]="showCounter"
      hint="Helpful hint" placeholder="Example value" autocomplete="off"
      inputMode="decimal" [errorMessages]="errorMessages" />
    <button type="submit">Submit</button>
  </form>`,
})
class Host {
  readonly control = new FormControl<string | number | null>('', Validators.required);
  readonly form = new FormGroup({ value: this.control });
  type: AppInput['type'] = 'text';
  minLength?: number;
  maxLength?: number;
  pattern = '';
  min?: number;
  max?: number;
  step?: number | 'any';
  showCounter = false;
  errorMessages: Record<string, string> = {};
}

function setup() {
  const fixture = TestBed.createComponent(Host);
  fixture.changeDetectorRef.markForCheck(); fixture.detectChanges();
  const host = fixture.componentInstance;
  const element: HTMLElement = fixture.nativeElement;
  const input = element.querySelector('input')!;
  const component = fixture.debugElement.query(By.directive(AppInput)).componentInstance as AppInput;
  const enter = (value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.changeDetectorRef.markForCheck(); fixture.detectChanges();
  };
  return { fixture, host, element, input, component, enter };
}

describe('AppInput', () => {
  it('preserves text exactly and propagates changes and touched state', () => {
    const { host, input, enter } = setup();
    enter('  001.2300 !  ');
    expect(host.control.value).toBe('  001.2300 !  ');
    expect(host.control.dirty).toBe(true);
    expect(host.control.touched).toBe(false);
    input.dispatchEvent(new Event('blur'));
    expect(host.control.touched).toBe(true);
  });

  it('writes and resets programmatic values without invoking change or touched callbacks', () => {
    const { component, host, input, fixture } = setup();
    host.control.setValue(' From model ');
    fixture.changeDetectorRef.markForCheck(); fixture.detectChanges();
    expect(input.value).toBe(' From model ');
    host.control.reset(); fixture.changeDetectorRef.markForCheck(); fixture.detectChanges();
    expect(input.value).toBe('');
    const change = vi.fn(); const touched = vi.fn();
    component.registerOnChange(change); component.registerOnTouched(touched);
    component.writeValue('  unchanged  '); fixture.changeDetectorRef.markForCheck(); fixture.detectChanges();
    expect(input.value).toBe('  unchanged  ');
    expect(change).not.toHaveBeenCalled(); expect(touched).not.toHaveBeenCalled();
  });

  it('renders programmatic values and states in zoneless forms', async () => {
    const { host, fixture, input, element } = setup();
    host.control.setValue('model update');
    await fixture.whenStable();
    expect(input.value).toBe('model update');
    host.control.disable();
    await fixture.whenStable();
    expect(input.disabled).toBe(true);
    host.control.enable(); host.control.setValue(''); host.control.markAsTouched();
    await fixture.whenStable();
    expect(element.querySelector('#example-errors')).not.toBeNull();
  });

  it('propagates disabled and enabled state from the parent', () => {
    const { host, fixture, input } = setup();
    host.control.disable(); fixture.changeDetectorRef.markForCheck(); fixture.detectChanges(); expect(input.disabled).toBe(true);
    host.control.enable(); fixture.changeDetectorRef.markForCheck(); fixture.detectChanges(); expect(input.disabled).toBe(false);
  });

  it('shows errors on blur or submission and associates label, hint and errors', () => {
    const { input, element, fixture, host } = setup();
    expect(element.querySelector('.app-input__errors')).toBeNull();
    expect(element.querySelector('label')?.htmlFor).toBe('example');
    expect(input.getAttribute('aria-describedby')).toBe('example-hint');
    expect(input.placeholder).toBe('Example value');
    expect(input.autocomplete).toBe('off');
    expect(input.getAttribute('inputmode')).toBe('decimal');
    expect(input.required).toBe(true);
    input.dispatchEvent(new Event('blur')); fixture.changeDetectorRef.markForCheck(); fixture.detectChanges();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('example-hint example-errors');
    expect(element.querySelector('#example-errors')?.textContent).toContain('This field is required.');
    host.control.markAsUntouched(); fixture.changeDetectorRef.markForCheck(); fixture.detectChanges();
    expect(element.querySelector('.app-input__errors')).toBeNull();
    element.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.changeDetectorRef.markForCheck(); fixture.detectChanges();
    expect(host.control.touched).toBe(false);
    expect(element.querySelector('.app-input__errors')).not.toBeNull();
  });

  it('composes dynamic length and pattern validators with parent rules without filtering text', () => {
    const { host, fixture, enter, input } = setup();
    host.minLength = 3; host.maxLength = 5; host.pattern = '[a-z]+';
    fixture.changeDetectorRef.markForCheck(); fixture.detectChanges();
    expect(host.control.hasError('required')).toBe(true);
    enter('A!');
    expect(input.value).toBe('A!'); expect(host.control.value).toBe('A!');
    expect(host.control.hasError('minlength')).toBe(true);
    expect(host.control.hasError('pattern')).toBe(true);
    enter('abcdef'); expect(host.control.hasError('maxlength')).toBe(true);
    host.maxLength = 10; fixture.changeDetectorRef.markForCheck(); fixture.detectChanges(); expect(host.control.valid).toBe(true);
    host.minLength = 8; fixture.changeDetectorRef.markForCheck(); fixture.detectChanges(); expect(host.control.hasError('minlength')).toBe(true);
    host.pattern = '[0-9]+'; fixture.changeDetectorRef.markForCheck(); fixture.detectChanges(); expect(host.control.hasError('pattern')).toBe(true);
    host.minLength = undefined; host.maxLength = undefined; host.pattern = '';
    fixture.changeDetectorRef.markForCheck(); fixture.detectChanges(); expect(host.control.valid).toBe(true);
    enter(''); expect(host.control.hasError('required')).toBe(true);
  });

  it('validates email when configured and revalidates when type changes', () => {
    const { host, fixture, enter } = setup();
    enter('invalid'); expect(host.control.valid).toBe(true);
    host.type = 'email'; fixture.changeDetectorRef.markForCheck(); fixture.detectChanges(); expect(host.control.hasError('email')).toBe(true);
    enter('person@example.com'); expect(host.control.valid).toBe(true);
    host.type = 'password'; fixture.changeDetectorRef.markForCheck(); fixture.detectChanges(); expect(host.control.valid).toBe(true);
  });

  it('handles numbers, empty values, dynamic bounds and fractional steps without rounding', () => {
    const { host, fixture, enter, input } = setup();
    host.type = 'number'; host.min = 0; host.max = 10; host.step = 0.1;
    fixture.changeDetectorRef.markForCheck(); fixture.detectChanges();
    enter('1.23'); expect(host.control.value).toBe(1.23); expect(host.control.hasError('step')).toBe(true);
    expect(input.value).toBe('1.23');
    host.step = 0.01; fixture.changeDetectorRef.markForCheck(); fixture.detectChanges(); expect(host.control.valid).toBe(true);
    enter('-1'); expect(host.control.hasError('min')).toBe(true);
    enter('11'); expect(host.control.hasError('max')).toBe(true);
    host.max = 20; fixture.changeDetectorRef.markForCheck(); fixture.detectChanges(); expect(host.control.valid).toBe(true);
    host.min = 12; fixture.changeDetectorRef.markForCheck(); fixture.detectChanges(); expect(host.control.hasError('min')).toBe(true);
    host.min = undefined; host.max = undefined; host.step = 'any'; fixture.changeDetectorRef.markForCheck(); fixture.detectChanges();
    enter('0.123456789'); expect(host.control.value).toBe(0.123456789); expect(host.control.valid).toBe(true);
    enter(''); expect(host.control.value).toBeNull(); expect(host.control.hasError('required')).toBe(true);
    enter('not-a-number'); expect(host.control.value).toBeNull();
  });

  it('supports custom messages and parent business validators', () => {
    const { host, fixture, enter, input, element } = setup();
    host.control.addValidators(() => ({ decimal: true }));
    host.errorMessages = { decimal: 'Enter a price with at most 2 decimal places.' };
    enter('1.234'); input.dispatchEvent(new Event('blur')); fixture.changeDetectorRef.markForCheck(); fixture.detectChanges();
    expect(element.querySelector('#example-errors')?.textContent).toContain('Enter a price with at most 2 decimal places.');
    expect(host.control.hasError('decimal')).toBe(true);
  });

  it('shows an optional accessible counter, including programmatic updates and reset', () => {
    const { host, fixture, element, input, enter } = setup();
    expect(element.querySelector('#example-counter')).toBeNull();
    host.showCounter = true; host.maxLength = 10; fixture.changeDetectorRef.markForCheck(); fixture.detectChanges();
    enter(' ab ');
    expect(element.querySelector('#example-counter')?.textContent).toBe('4 / 10 characters');
    expect(input.getAttribute('aria-describedby')).toContain('example-counter');
    host.control.setValue('abc'); fixture.changeDetectorRef.markForCheck(); fixture.detectChanges();
    expect(element.querySelector('#example-counter')?.textContent).toBe('3 / 10 characters');
    host.control.reset(); fixture.changeDetectorRef.markForCheck(); fixture.detectChanges();
    expect(element.querySelector('#example-counter')?.textContent).toBe('0 / 10 characters');
  });
});
