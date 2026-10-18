import { Component, ElementRef, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

const nonBlank: ValidatorFn = control =>
  typeof control.value === 'string' && control.value.trim().length > 0
    ? null : { required: true };

const passwordRequirements: ValidatorFn = control => {
  const value = control.value as string;
  const errors: Record<string, boolean> = {};
  if (!/\p{Ll}/u.test(value)) errors['lowercase'] = true;
  if (!/\p{Lu}/u.test(value)) errors['uppercase'] = true;
  if (!/[0-9]/.test(value)) errors['number'] = true;
  if (!/[^\p{L}\p{M}\p{N}\s]/u.test(value)) errors['special'] = true;
  return Object.keys(errors).length ? errors : null;
};

type Field = 'name' | 'lastname' | 'email' | 'password';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected submitted = false;
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [nonBlank, Validators.maxLength(50)] }),
    lastname: new FormControl('', { nonNullable: true, validators: [nonBlank, Validators.maxLength(50)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, passwordRequirements] }),
  });

  protected showErrors(field: Field): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted);
  }

  protected errors(field: Field): string[] {
    const errors = this.form.controls[field].errors;
    if (!errors) return [];
    if (errors['required']) return ['This field is required.'];
    const messages: Record<string, string> = {
      maxlength: 'Use no more than 50 characters.',
      email: 'Enter a valid email address.',
      lowercase: 'Include at least one lowercase letter.',
      uppercase: 'Include at least one uppercase letter.',
      number: 'Include at least one number.',
      special: 'Include at least one special character other than whitespace.',
    };
    return Object.keys(errors).map(key => messages[key]);
  }

  protected submit(): void {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const firstInvalid = (Object.keys(this.form.controls) as Field[])
        .find(field => this.form.controls[field].invalid);
      this.host.nativeElement.querySelector<HTMLInputElement>(`[formControlName="${firstInvalid}"]`)?.focus();
    }
    // Valid values remain local until registration integration is implemented.
  }
}
