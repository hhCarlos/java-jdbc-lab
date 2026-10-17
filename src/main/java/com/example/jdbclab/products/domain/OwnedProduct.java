package com.example.jdbclab.products.domain;

import java.math.BigDecimal;

/** Product data for an owner's listing, including its stable publication status code. */
public record OwnedProduct(Long id, String title, BigDecimal price, String description,
                           long stock, String statusCode) {
}
