import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, defer, finalize } from 'rxjs';
import { BlockingLoaderService } from '../../../shared/blocking-loader/blocking-loader.service';
import { CreateProductRequest } from '../products.models';
import { ProductsService } from '../products.service';
import { Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AppInput } from '../../../shared/app-input/app-input';
import { AppModal } from '../../../shared/app-modal/app-modal';
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
  imports: [ReactiveFormsModule, AppButton, AppInput, AppModal],
  templateUrl: './product-form.html',
  styleUrl: './product-form.scss',
})
export class ProductForm {
  private readonly route = inject(ActivatedRoute);
  protected readonly mode = signal<'create' | 'edit'>('create');
  // Preserve signed 64-bit IDs as text rather than rounding them to a JS number.
  protected readonly productId = signal<string | null>(null);
  protected readonly editError = signal<string | null>(null);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly service = inject(ProductsService);
  private readonly loader = inject(BlockingLoaderService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly submitting = signal(false);
  protected readonly cancelConfirmationOpen = signal(false);
  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [nonBlank, Validators.maxLength(50)] }),
    price: new FormControl('', { nonNullable: true, validators: [Validators.required, decimal(2)] }),
    description: new FormControl('', { nonNullable: true }),
    stock: new FormControl('', { nonNullable: true, validators: [Validators.required, decimal(0)] }),
  });

  protected readonly priceErrors = {
    decimal: 'Enter a price from 0 to 9999999999.99 with no more than 2 decimal places.',
  };
  protected readonly stockErrors = {
    decimal: 'Enter a whole number from 0 to 9999999999.',
  };

  constructor() {
    combineLatest([this.route.data, this.route.paramMap]).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(([data, params]) => {
      const mode = data['mode'] === 'edit' ? 'edit' : 'create';
      this.mode.set(mode);
      const id = params.get('id');
      const validId = id !== null && /^[0-9]+$/.test(id)
        && BigInt(id) > 0n && BigInt(id) <= 9_223_372_036_854_775_807n;
      this.productId.set(mode === 'edit' && validId ? id : null);
      this.editError.set(mode === 'edit' && !validId
        ? 'Invalid product ID. Enter a positive 64-bit integer product ID.' : null);
      if (mode === 'edit') this.form.disable();
      else this.form.enable();
    });
  }

  protected submit(): void {
    if (this.mode() !== 'create' || this.submitting()) return;
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
    defer(() => this.service.create(request)).pipe(
      finalize(() => {
        releaseLoader();
        this.submitting.set(false);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.form.markAsPristine();
        void this.router.navigate(['/app/products']);
      },
      error: () => console.log('Unable to create product. Please try again.'),
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
