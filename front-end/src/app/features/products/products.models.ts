/** JSON representation of the backend OwnedProduct record. */
export interface OwnedProduct {
  id: number;
  title: string;
  price: number;
  description: string | null;
  stock: number;
  /** Backend publication code; the service does not filter by status. */
  statusCode: string;
}

/** Only client-editable fields; ownership and publication status are assigned by the backend. */
export interface CreateProductRequest {
  /** Nonblank, at most 50 characters. */
  title: string;
  /** JSON number: non-negative, at most 10 integer and 2 fractional digits. */
  price: number;
  /** Omitted or null means no description. */
  description?: string | null;
  /** JSON integer from 0 through 9_999_999_999. */
  stock: number;
  /** Optional publication choice; omitted uses the backend's stock-based default. */
  active?: boolean;
}

/** Replacement fields; omitted or null description clears the existing description. */
export interface UpdateProductRequest extends Omit<CreateProductRequest, 'active'> {
  /** Publication choice; zero stock always forces INACTIVE. Omitted/null preserves status with positive stock. */
  active?: boolean | null;
}

/** Request pagination only: the endpoint returns an array without total counts. */
export interface ProductPagination {
  /** Zero-based integer from 0 through 2_147_483_647. Defaults to 0. */
  page?: number;
  /** Integer from 1 through 100. Defaults to 20. */
  pageSize?: number;
}
