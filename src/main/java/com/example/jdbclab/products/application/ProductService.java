package com.example.jdbclab.products.application;

import com.example.jdbclab.products.domain.OwnedProduct;
import java.util.List;
import java.math.BigDecimal;
import java.util.Objects;

/** Owner-scoped product operations, independent of authentication transport. */
public class ProductService {
    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;
    private final ProductRepository repository;

    public ProductService(ProductRepository repository) {
        this.repository = repository;
    }

    public void softDeleteByIdAndOwnerId(Long productId, Long ownerUserId) {
        Objects.requireNonNull(ownerUserId, "Owner user ID is required.");
        if (productId == null || productId <= 0) {
            throw new IllegalArgumentException("Product ID must be positive.");
        }
        int affected = repository.softDeleteByIdAndOwnerId(productId, ownerUserId);
        if (affected == 0) throw new ProductNotFoundException(productId);
        if (affected != 1) throw new IllegalStateException("Product soft deletion affected an unexpected number of rows.");
    }

    public OwnedProduct findByIdAndOwnerId(Long productId, Long ownerUserId) {
        Objects.requireNonNull(ownerUserId, "Owner user ID is required.");
        if (productId == null || productId <= 0) {
            throw new IllegalArgumentException("Product ID must be positive.");
        }
        return repository.findByIdAndOwnerId(productId, ownerUserId)
                .orElseThrow(() -> new ProductNotFoundException(productId));
    }

    public List<OwnedProduct> findByOwnerId(Long ownerUserId, int page, int pageSize) {
        Objects.requireNonNull(ownerUserId, "Owner user ID is required.");
        if (page < 0) throw new IllegalArgumentException("Page must be non-negative.");
        if (pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("Page size must be between 1 and 100.");
        }
        return repository.findByOwnerId(ownerUserId, (long) page * pageSize, pageSize);
    }

    public OwnedProduct create(Long ownerUserId, String title, BigDecimal price, String description, long stock) {
        Objects.requireNonNull(ownerUserId, "Owner user ID is required.");
        validateFields(title, price, stock);
        return repository.insert(ownerUserId, title, price, description, stock,
                stock > 0 ? "ACTIVE" : "INACTIVE");
    }

    public OwnedProduct update(Long productId, Long ownerUserId, String title, BigDecimal price,
                               String description, long stock) {
        validateFields(title, price, stock);
        var current = findByIdAndOwnerId(productId, ownerUserId);
        if (!"ACTIVE".equals(current.statusCode()) && !"INACTIVE".equals(current.statusCode())) {
            throw new ProductNotFoundException(productId);
        }
        String status = "ACTIVE".equals(current.statusCode()) && stock > 0 ? "ACTIVE" : "INACTIVE";
        int affected = repository.update(productId, ownerUserId, title, price, description, stock, status);
        if (affected == 0) throw new ProductNotFoundException(productId);
        if (affected != 1) throw new IllegalStateException("Product update affected an unexpected number of rows.");
        return findByIdAndOwnerId(productId, ownerUserId);
    }

    private static void validateFields(String title, BigDecimal price, long stock) {
        if (title == null || title.isBlank() || title.length() > 50) {
            throw new IllegalArgumentException("Title must be nonblank and at most 50 characters.");
        }
        if (price == null || price.signum() < 0 || price.scale() > 2
                || price.precision() - price.scale() > 10) {
            throw new IllegalArgumentException("Price must be non-negative and fit NUMBER(12,2).");
        }
        if (stock < 0 || stock > 9999999999L) {
            throw new IllegalArgumentException("Stock must be between 0 and 9999999999.");
        }
    }
}
