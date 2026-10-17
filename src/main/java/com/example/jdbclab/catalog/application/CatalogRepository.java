package com.example.jdbclab.catalog.application;

import com.example.jdbclab.catalog.domain.CatalogProduct;
import java.util.List;
import java.util.Optional;

public interface CatalogRepository {
    /** Returns at most limit products, ordered by ID ascending, across all owners. */
    List<CatalogProduct> findAll(long offset, int limit);

    Optional<CatalogProduct> findById(Long id);
}
