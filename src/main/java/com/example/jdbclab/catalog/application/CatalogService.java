package com.example.jdbclab.catalog.application;

import com.example.jdbclab.catalog.domain.CatalogProduct;
import java.util.List;

/** Framework-free, public reads with zero-based pagination. */
public class CatalogService {
    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;
    private final CatalogRepository repository;

    public CatalogService(CatalogRepository repository) {
        this.repository = repository;
    }

    public List<CatalogProduct> findAll() {
        return findAll(0);
    }

    public List<CatalogProduct> findAll(int page) {
        return findAll(page, DEFAULT_PAGE_SIZE);
    }

    public List<CatalogProduct> findAll(int page, int pageSize) {
        if (page < 0) throw new IllegalArgumentException("Page must be non-negative.");
        if (pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("Page size must be between 1 and 100.");
        }
        return repository.findAll((long) page * pageSize, pageSize);
    }

    public CatalogProduct findById(Long id) {
        return repository.findById(id).orElseThrow(() -> new ProductNotFoundException(id));
    }
}
