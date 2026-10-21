import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, EMPTY, catchError, combineLatest, defer, finalize, switchMap, tap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { BlockingLoaderService } from '../../../shared/blocking-loader/blocking-loader.service';
import { CreateProductRequest } from '../products.models';
import { ProductsService } from '../products.service';
import { Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AppIcon } from '../../../shared/app-icon/app-icon';
import { AppInput } from '../../../shared/app-input/app-input';
import { AppModal } from '../../../shared/app-modal/app-modal';
import { AppButton } from '../../../shared/app-button/app-button';
import { NotificationService } from '../../../layouts/app-layout/services/notification.service';

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

type Field = 'title' | 'price' | 'description' | 'stock' | 'suspended';

@Component({
  selector: 'app-product-form',
  imports: [ReactiveFormsModule, AppButton, AppInput, AppModal, AppIcon],
  templateUrl: './product-form.html',
  styleUrl: './product-form.scss',
})
export class ProductForm {
  private readonly route = inject(ActivatedRoute);
  protected readonly mode = signal<'create' | 'edit'>('create');
  // Preserve signed 64-bit IDs as text rather than rounding them to a JS number.
  protected readonly productId = signal<string | null>(null);
  protected readonly editError = signal<string | null>(null);
  protected readonly productLoaded = signal(false);
  protected readonly loading = signal(false);
  protected readonly recoverable = signal(false);
  private readonly reload = new BehaviorSubject(0);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly service = inject(ProductsService);
  private readonly loader = inject(BlockingLoaderService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly submitting = signal(false);
  protected readonly cancelConfirmationOpen = signal(false);
  protected readonly deleteConfirmationOpen = signal(false);
  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [nonBlank, Validators.maxLength(50)] }),
    price: new FormControl('', { nonNullable: true, validators: [Validators.required, decimal(2)] }),
    description: new FormControl('', { nonNullable: true }),
    suspended: new FormControl(false, { nonNullable: true }),
    stock: new FormControl('', { nonNullable: true, validators: [Validators.required, decimal(0)] }),
  });

  protected readonly priceErrors = {
    decimal: 'Enter a price from 0 to 9999999999.99 with no more than 2 decimal places.',
  };
  protected readonly stockErrors = {
    decimal: 'Enter a whole number from 0 to 9999999999.',
  };

  constructor() {
    combineLatest([this.route.data, this.route.paramMap, this.reload]).pipe(
      switchMap(([data, params]) => {
        this.deleteConfirmationOpen.set(false);
        const mode = data['mode'] === 'edit' ? 'edit' : 'create';
        this.mode.set(mode);
        this.productLoaded.set(false);
        const id = params.get('id');
        const validId = id !== null && /^[0-9]+$/.test(id)
          && BigInt(id) > 0n && BigInt(id) <= 9_223_372_036_854_775_807n;
        this.productId.set(mode === 'edit' && validId ? id : null);
        this.editError.set(null);
        this.recoverable.set(false);
        if (mode === 'create') {
          this.form.enable();
          return EMPTY;
        }
        this.form.reset();
        this.form.disable();
        if (!validId) {
          this.editError.set('Invalid product ID. Enter a positive 64-bit integer product ID.');
          return EMPTY;
        }
        this.loading.set(true);
        return defer(() => this.service.getById(id!)).pipe(
          tap(product => {
            this.form.reset({
              title: product.title,
              price: String(product.price),
              description: product.description ?? '',
              stock: String(product.stock),
              suspended: product.statusCode === 'INACTIVE',
            });
            this.form.enable();
            this.productLoaded.set(true);
          }),
          catchError((error: unknown) => {
            const status = error instanceof HttpErrorResponse ? error.status : undefined;
            this.editError.set(status === 404 ? 'This product is unavailable.'
              : status === 401 ? 'Your session has expired. Please sign in again.'
              : status === 403 ? 'You do not have permission to view this product.'
              : 'Unable to load product. Please try again.');
            this.recoverable.set(status === undefined || status === 0 || status === 408
              || status === 429 || status >= 500);
            return EMPTY;
          }),
          finalize(() => this.loading.set(false)),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe();
  }

  protected retry(): void {
    if (this.recoverable() && !this.loading()) this.reload.next(this.reload.value + 1);
  }

  protected canDelete(): boolean {
    return this.mode() === 'edit' && this.productLoaded() && !this.loading()
      && this.productId() !== null && !this.submitting();
  }

  protected requestDeletion(): void {
    if (this.canDelete()) this.deleteConfirmationOpen.set(true);
  }

  protected keepProduct(): void {
    this.deleteConfirmationOpen.set(false);
  }

  protected confirmDeletion(): void {
    if (!this.deleteConfirmationOpen() || !this.canDelete()) return;
    const id = this.productId()!;
    this.deleteConfirmationOpen.set(false);
    this.submitting.set(true);
    const releaseLoader = this.loader.show();
    defer(() => this.service.deleteById(id)).pipe(
      finalize(() => {
        releaseLoader();
        this.submitting.set(false);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.form.markAsPristine();
        this.notifications.publish({ status: 'success', message: 'Product deleted successfully.' });
        void this.router.navigate(['/app/products']);
      },
      error: () => this.notifications.publish({
        status: 'error', message: 'Unable to delete the product. Please try again.',
      }),
    });
  }

  protected canSubmit(): boolean {
    return !this.submitting() && !this.deleteConfirmationOpen() && !this.form.pending && this.form.valid
      && (this.mode() === 'create' || (this.productLoaded() && !this.loading()
        && this.productId() !== null && this.form.dirty));
  }

  protected submit(): void {
    const editing = this.mode() === 'edit';
    const id = this.productId();
    if (this.submitting() || this.deleteConfirmationOpen() || (editing && (!this.productLoaded() || this.loading()
      || id === null || this.form.pristine))) return;
    this.form.markAllAsTouched();
    if (this.form.pending) return;
    if (this.form.invalid) {
      const firstInvalid = (Object.keys(this.form.controls) as Field[])
        .find(field => this.form.controls[field].invalid);
      this.host.nativeElement.querySelector<HTMLElement>(`[formControlName="${firstInvalid}"] input, textarea[formControlName="${firstInvalid}"]`)?.focus();
      return;
    }
    const values = this.form.getRawValue();
    const request: CreateProductRequest = {
      title: values.title,
      price: Number(values.price),
      description: values.description,
      stock: Number(values.stock),
    };
    this.submitting.set(true);
    const releaseLoader = this.loader.show();
    defer(() => editing ? this.service.update(id!, { ...request, active: !values.suspended }) : this.service.create(request)).pipe(
      finalize(() => {
        releaseLoader();
        this.submitting.set(false);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: product => {
        if (editing) this.form.controls.suspended.setValue(product.statusCode === 'INACTIVE');
        this.form.markAsPristine();
        this.notifications.publish({
          status: 'success',
          message: editing ? 'Product updated successfully.' : 'Product created successfully.',
        });
        void this.router.navigate(['/app/products']);
      },
      error: () => this.notifications.publish({
        status: 'error',
        message: editing ? 'Unable to update the product. Please try again.'
          : 'Unable to create the product. Please try again.',
      }),
    });
  }

  protected cancel(): void {
    if (this.form.dirty) {
      this.cancelConfirmationOpen.set(true);
      return;
    }
    this.leaveWithoutSaving();
  }

  protected keepEditing(): void {
    this.cancelConfirmationOpen.set(false);
  }

  protected leaveWithoutSaving(): void {
    this.cancelConfirmationOpen.set(false);
    void this.router.navigate(['/app/products']);
  }
}
