import { Component, ElementRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AppButton } from '../../../shared/app-button/app-button';

const nonBlank: ValidatorFn = control =>
  typeof control.value === 'string' && control.value.trim().length > 0 ? null : { required: true };

// Keep decimal input as text so excess fractional digits are not rounded away.
const decimal = (fraction: number): ValidatorFn => control => {
  const value = String(control.value);
  if (!value) return null;
  const match = /^\+?(\d+)(?:\.(\d*))?$/.exec(value);
  if (!match) return { decimal: true };
  const integers = match[1].replace(/^0+/, '');
  return integers.length <= 10 && (match[2]?.length ?? 0) <= fraction
    ? null : { decimal: true };
};

type Field = 'title' | 'price' | 'description' | 'stock';

@Component({
  selector: 'app-product-form',
  imports: [ReactiveFormsModule, AppButton],
  templateUrl: './product-form.html',
  styleUrl: './product-form.scss',
})
export class ProductForm {
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly feedback = signal('');
  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [nonBlank, Validators.maxLength(50)] }),
    price: new FormControl('', { nonNullable: true, validators: [Validators.required, decimal(2)] }),
    description: new FormControl('', { nonNullable: true }),
    stock: new FormControl('', { nonNullable: true, validators: [Validators.required, decimal(0)] }),
  });

  protected showErrors(field: Field): boolean {
    const control = this.form.controls[field];
    return control.invalid && control.touched;
  }

  protected error(field: Field): string {
    const control = this.form.controls[field];
    if (control.hasError('required')) return 'This field is required.';
    if (control.hasError('maxlength')) return 'Use no more than 50 characters.';
    return field === 'price'
      ? 'Enter a price from 0 to 9999999999.99 with no more than 2 decimal places.'
      : 'Enter a whole number from 0 to 9999999999.';
  }

  protected submit(): void {
    this.feedback.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      const firstInvalid = (Object.keys(this.form.controls) as Field[])
        .find(field => this.form.controls[field].invalid);
      this.host.nativeElement.querySelector<HTMLElement>(`[formControlName="${firstInvalid}"]`)?.focus();
      return;
    }
    this.feedback.set('Saving products is not available yet. Your entries have not been saved.');
  }

  protected cancel(): void {
    void this.router.navigate(['/app/products']);
  }
}
