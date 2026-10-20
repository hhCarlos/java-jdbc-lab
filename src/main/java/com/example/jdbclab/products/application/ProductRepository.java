package com.example.jdbclab.products.application;

import com.example.jdbclab.products.domain.OwnedProduct;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface ProductRepository {
    /** Finds this owner's non-deleted product, including inactive products and zero stock. */
    Optional<OwnedProduct> findByIdAndOwnerId(Long productId, Long ownerUserId);

    /**
     * Lists this owner's non-deleted products, including zero stock, by ascending ID.
     * Offset is a zero-based row offset; limit must be between 1 and 100.
     * Returns an empty list when no rows match; no total count is included.
     */
    List<OwnedProduct> findByOwnerId(Long ownerUserId, long offset, int limit);

    /** Inserts supplied values and returns the database record, including its generated ID.
     * Owner and status must reference existing database rows; constraint failures propagate.
     */
    OwnedProduct insert(Long ownerUserId, String title, BigDecimal price, String description,
                        long stock, String statusCode);
}
