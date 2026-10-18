import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { AuthService } from '../auth.service';
import { BlockingLoaderService } from '../../../shared/blocking-loader/blocking-loader.service';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

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
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly auth = inject(AuthService);
  private readonly loader = inject(BlockingLoaderService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly submitting = signal(false);
  protected readonly feedback = signal('');
  protected submitted = false;
  protected passwordFocused = false;
  protected readonly passwordChecklist = [
    { key: 'lowercase', label: 'At least one lowercase letter.' },
    { key: 'uppercase', label: 'At least one uppercase letter.' },
    { key: 'number', label: 'At least one number.' },
    { key: 'special', label: 'At least one special character, excluding whitespace.' },
  ];
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [nonBlank, Validators.maxLength(50)] }),
    lastname: new FormControl('', { nonNullable: true, validators: [nonBlank, Validators.maxLength(50)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, passwordRequirements] }),
  });

  protected get passwordDescription(): string {
    return [
      'register-password-hint',
      ...(this.passwordFocused ? ['register-password-checklist'] : []),
      ...(this.showErrors('password') ? ['register-password-errors'] : []),
    ].join(' ');
  }

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
    if (this.submitting()) return;
    this.feedback.set('');
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const firstInvalid = (Object.keys(this.form.controls) as Field[])
        .find(field => this.form.controls[field].invalid);
      this.host.nativeElement.querySelector<HTMLInputElement>(`[formControlName="${firstInvalid}"]`)?.focus();
      return;
    }

    this.submitting.set(true);
    const releaseLoader = this.loader.show();
    this.auth.register(this.form.getRawValue()).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        releaseLoader();
        this.submitting.set(false);
      }),
    ).subscribe({
      next: () => {
        this.submitted = false;
        this.form.controls.password.reset('');
        this.feedback.set('Your account has been created. You can now sign in.');

        void this.router.navigate(['/auth/login']);
      },
      error: (error: unknown) => {
        let message = 'Unable to create your account. Please try again.';
        if (error instanceof HttpErrorResponse) {
          switch (error.status) {
            case 0:
              message = 'Unable to connect to the server. Check your connection and try again.';
              break;
            case 400:
              message = 'Some registration details were rejected. Check your entries. Use an email of at most 254 characters and a password of at most 72 UTF-8 bytes, then try again.';
              break;
            case 409:
              message = 'This email is already registered. Sign in or use a different email address.';
              break;
          }
        }
        this.feedback.set(message);
      },
    });
  }
}
