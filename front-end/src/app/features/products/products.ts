import { Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal, TemplateRef, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, map, of, startWith, switchMap } from 'rxjs';
import { AppButton } from '../../shared/app-button/app-button';
import { AppTable, TableColumn, TableRowContext } from '../../shared/app-table/app-table';
import { OwnedProduct, ProductPagination } from './products.models';
import { ProductsService } from './products.service';

type ProductsState =
  | { kind: 'loading'; page: number }
  | { kind: 'ready'; page: number; rows: OwnedProduct[] }
  | { kind: 'error'; page: number; message: string; recoverable: boolean };

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [AppTable, AppButton, DecimalPipe],
  templateUrl: './products.html',
  styleUrl: './products.scss',
})
export class Products {
  private readonly router = inject(Router);

  protected newProduct(): void {
    void this.router.navigate(['/app/products/create']);
  }

  private readonly service = inject(ProductsService);
  private readonly requests = new BehaviorSubject<number>(0);
  protected readonly pageSize = 20;
  protected readonly state = signal<ProductsState>({ kind: 'loading', page: 0 });
  private readonly priceTemplate = viewChild<TemplateRef<TableRowContext<OwnedProduct>>>('price');
  private readonly statusTemplate = viewChild<TemplateRef<TableRowContext<OwnedProduct>>>('status');
  protected readonly columns = computed<readonly TableColumn<OwnedProduct>[]>(() => [
    { key: 'id', header: 'ID' },
    { key: 'title', header: 'Title' },
    { key: 'price', header: 'Price', cellTemplate: this.priceTemplate() },
    { key: 'stock', header: 'Stock' },
    { key: 'statusCode', header: 'Status', cellTemplate: this.statusTemplate() },
  ]);
  protected readonly canNext = computed(() => {
    const state = this.state();
    return state.kind === 'ready' && state.rows.length === this.pageSize && state.page < 2_147_483_647;
  });

  constructor() {
    this.requests.pipe(
      switchMap(page => {
        const pagination: ProductPagination = { page, pageSize: this.pageSize };
        return this.service.listMine(pagination).pipe(
          map((rows): ProductsState => ({ kind: 'ready', page, rows })),
          catchError((error: unknown) => of(this.errorState(page, error))),
          startWith<ProductsState>({ kind: 'loading', page }),
        );
      }),
      takeUntilDestroyed(),
    ).subscribe(state => this.state.set(state));
  }

  protected previous(): void {
    const page = this.state().page;
    if (page > 0) this.requests.next(page - 1);
  }

  protected next(): void {
    if (this.canNext()) this.requests.next(this.state().page + 1);
  }

  protected retry(): void {
    const state = this.state();
    if (state.kind === 'error' && state.recoverable) this.requests.next(state.page);
  }

  protected statusLabel(code: string): string {
    switch (code) {
      case 'ACTIVE': return 'Active';
      case 'INACTIVE': return 'Inactive';
      case 'DELETED': return 'Deleted';
      default: return 'Unknown status';
    }
  }

  private errorState(page: number, error: unknown): ProductsState {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return { kind: 'error', page, message: 'Your session has expired. Please sign in again.', recoverable: false };
      }
      if (error.status === 403) {
        return { kind: 'error', page, message: 'You do not have permission to view these products.', recoverable: false };
      }
      const recoverable = error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500;
      return { kind: 'error', page, message: 'Unable to load products.', recoverable };
    }
    return { kind: 'error', page, message: 'Unable to load products.', recoverable: true };
  }
}
