package com.example.jdbclab.catalog.domain;

import java.math.BigDecimal;

/** Public catalog data; ownership and account details are deliberately absent. */
public record CatalogProduct(Long id, String title, BigDecimal price, String description, long stock) {
}
