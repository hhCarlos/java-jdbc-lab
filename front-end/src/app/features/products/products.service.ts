import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import { OwnedProduct, ProductPagination } from './products.models';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);

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
