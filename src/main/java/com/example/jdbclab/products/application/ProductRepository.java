package com.example.jdbclab.products.application;

import com.example.jdbclab.products.domain.OwnedProduct;
import java.util.List;

public interface ProductRepository {
    /**
     * Lists this owner's non-deleted products, including zero stock, by ascending ID.
     * Offset is a zero-based row offset; limit must be between 1 and 100.
     * Returns an empty list when no rows match; no total count is included.
     */
    List<OwnedProduct> findByOwnerId(Long ownerUserId, long offset, int limit);
}
