import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthService } from '../auth.service';
import { SessionService } from '../session.service';
import { BlockingLoaderService } from '../../../shared/blocking-loader/blocking-loader.service';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

type Field = 'email' | 'password';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly loader = inject(BlockingLoaderService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly submitting = signal(false);
  protected readonly feedback = signal('');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected submitted = false;
  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected showErrors(field: Field): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted);
  }

  protected error(field: Field): string {
    return this.form.controls[field].hasError('required')
      ? 'This field is required.' : 'Enter a valid email address.';
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
    this.auth.login(this.form.getRawValue()).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        releaseLoader();
        this.submitting.set(false);
      }),
    ).subscribe({
      next: response => {
        this.session.establish(response);
        this.submitted = false;
        this.form.controls.password.reset('');
        void this.router.navigate(['/app/products']);
      },
      error: (error: unknown) => {
        let message = 'Unable to sign in. Please try again.';
        if (error instanceof HttpErrorResponse) {
          if (error.status === 401) message = 'Invalid email or password. Please try again.';
          if (error.status === 0) message = 'Unable to connect to the server. Check your connection and try again.';
        }
        this.feedback.set(message);
      },
    });
  }
}
