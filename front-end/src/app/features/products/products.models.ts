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

/** Request pagination only: the endpoint returns an array without total counts. */
export interface ProductPagination {
  /** Zero-based integer from 0 through 2_147_483_647. Defaults to 0. */
  page?: number;
  /** Integer from 1 through 100. Defaults to 20. */
  pageSize?: number;
}
