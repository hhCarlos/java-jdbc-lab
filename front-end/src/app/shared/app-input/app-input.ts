import { ChangeDetectorRef, Component, DestroyRef, forwardRef, inject, Injector, Input, OnChanges, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, ControlValueAccessor, FormGroupDirective, NG_VALIDATORS, NG_VALUE_ACCESSOR, NgControl, ValidationErrors, Validator, Validators } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  templateUrl: './app-input.html',
  styleUrl: './app-input.scss',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AppInput), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => AppInput), multi: true },
  ],
})
export class AppInput implements ControlValueAccessor, Validator, OnChanges, OnInit {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) inputId!: string;
  @Input() type: 'text' | 'email' | 'password' | 'number' = 'text';
  @Input() inputMode?: string;
  @Input() placeholder?: string;
  @Input() autocomplete?: string;
  @Input() hint?: string;
  @Input() pattern?: string;
  @Input() minLength?: number;
  @Input() maxLength?: number;
  @Input() min?: number;
  @Input() max?: number;
  @Input() step?: number | 'any';
  @Input() showCounter = false;
  @Input() errorMessages: Readonly<Record<string, string>> = {};

  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly parentForm = inject(FormGroupDirective, { optional: true, skipSelf: true });
  protected ngControl: NgControl | null = null;
  protected value: string | number | null = '';
  protected disabled = false;
  private onChange: (value: string | number | null) => void = () => {};
  private onTouched: () => void = () => {};
  private validatorChanged: () => void = () => {};

  ngOnInit(): void {
    // Resolve after forms directives initialize to avoid a value-accessor DI cycle.
    this.ngControl = this.injector.get(NgControl, null, { self: true });
    this.ngControl?.control?.events.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.changeDetector.markForCheck());
  }
  ngOnChanges(): void { this.validatorChanged(); }
  writeValue(value: string | number | null): void {
    this.value = value ?? '';
    this.changeDetector.markForCheck();
  }
  registerOnChange(fn: typeof this.onChange): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
    this.changeDetector.markForCheck();
  }
  registerOnValidatorChange(fn: () => void): void { this.validatorChanged = fn; }

  validate(control: AbstractControl): ValidationErrors | null {
    const validators = [];
    if (this.type === 'email') validators.push(Validators.email);
    if (this.pattern !== undefined) validators.push(Validators.pattern(this.pattern));
    if (this.type !== 'number') {
      if (this.minLength !== undefined) validators.push(Validators.minLength(this.minLength));
      if (this.maxLength !== undefined) validators.push(Validators.maxLength(this.maxLength));
    } else {
      if (this.min !== undefined) validators.push(Validators.min(this.min));
      if (this.max !== undefined) validators.push(Validators.max(this.max));
      validators.push((c: AbstractControl): ValidationErrors | null => {
        if (c.value === '' || c.value == null) return null;
        const value = Number(c.value);
        if (!Number.isFinite(value)) return { number: true };
        const step = this.step ?? 1;
        if (step === 'any' || step <= 0) return null;
        const quotient = (value - (this.min ?? 0)) / step;
        return Math.abs(quotient - Math.round(quotient)) <= 1e-8
          ? null : { step: { step } };
      });
    }
    return Validators.compose(validators)?.(control) ?? null;
  }

  protected update(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.value = this.type === 'number'
      ? (input.value === '' || !Number.isFinite(input.valueAsNumber) ? null : input.valueAsNumber)
      : input.value;
    this.onChange(this.value);
  }
  protected touch(): void { this.onTouched(); }
  protected get showErrors(): boolean {
    return !!this.ngControl?.invalid && (!!this.ngControl.touched || !!this.parentForm?.submitted);
  }
  protected get required(): boolean { return !!this.ngControl?.control?.hasValidator(Validators.required); }
  protected get count(): number { return String(this.value ?? '').length; }
  protected get descriptions(): string | null {
    return [this.hint ? `${this.inputId}-hint` : '', this.showCounter ? `${this.inputId}-counter` : '',
      this.showErrors ? `${this.inputId}-errors` : ''].filter(Boolean).join(' ') || null;
  }
  protected get messages(): string[] {
    return Object.entries(this.ngControl?.errors ?? {}).map(([key, details]) => {
      if (this.errorMessages[key]) return this.errorMessages[key];
      switch (key) {
        case 'required': return 'This field is required.';
        case 'email': return 'Enter a valid email address.';
        case 'minlength': return `Use at least ${details.requiredLength} characters.`;
        case 'maxlength': return `Use no more than ${details.requiredLength} characters.`;
        case 'min': return `Enter a value of at least ${details.min}.`;
        case 'max': return `Enter a value no greater than ${details.max}.`;
        case 'pattern': return 'Use the requested format.';
        case 'step': return `Enter a value in increments of ${details.step}.`;
        case 'number': return 'Enter a valid number.';
        default: return 'Enter a valid value.';
      }
    });
  }
}
