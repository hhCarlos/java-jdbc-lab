import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import { CreateProductRequest, OwnedProduct, ProductPagination, UpdateProductRequest } from './products.models';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);

  /** Soft-deletes an owned product; authentication and HTTP errors stay in the HTTP pipeline. */
  deleteById(id: string): Observable<void> {
    if (!/^[0-9]+$/.test(id) || BigInt(id) <= 0n || BigInt(id) > 9_223_372_036_854_775_807n) {
      return throwError(() => new RangeError('Product ID must be a positive 64-bit integer.'));
    }
    return this.http.delete<void>(`/api/users/me/products/${encodeURIComponent(id)}`);
  }

  /** Loads an owned product; authentication and HTTP errors remain with the HTTP pipeline. */
  getById(id: string): Observable<OwnedProduct> {
    return this.http.get<OwnedProduct>(`/api/users/me/products/${encodeURIComponent(id)}`);
  }

  /** Creates a product; the backend validates values and assigns ownership and status. */
  create({ title, price, description, stock, active }: CreateProductRequest): Observable<OwnedProduct> {
    const body: CreateProductRequest = { title, price, stock };
    if (description !== undefined) body.description = description;
    if (active !== undefined) body.active = active;
    return this.http.post<OwnedProduct>('/api/users/me/products', body);
  }

  /** Replaces editable fields; authentication and HTTP errors stay in the HTTP pipeline. */
  update(id: string, { title, price, description, stock, active }: UpdateProductRequest): Observable<OwnedProduct> {
    const body: UpdateProductRequest = { title, price, stock };
    if (description !== undefined) body.description = description;
    if (active !== undefined) body.active = active;
    return this.http.put<OwnedProduct>(`/api/users/me/products/${encodeURIComponent(id)}`, body);
  }

  /** Lists the authenticated user's products; authentication is handled by the interceptor. */
  listMine({ page = 0, pageSize = 20 }: ProductPagination = {}): Observable<OwnedProduct[]> {
    if (!Number.isInteger(page) || page < 0 || page > 2_147_483_647) {
      return throwError(() => new RangeError('Page must be an integer between 0 and 2147483647.'));
    }
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      return throwError(() => new RangeError('Page size must be an integer between 1 and 100.'));
    }
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<OwnedProduct[]>('/api/users/me/products', { params });
  }
}
