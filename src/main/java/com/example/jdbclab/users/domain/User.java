package com.example.jdbclab.users.domain;

import java.time.OffsetDateTime;

/** User data available to read use cases; credentials are deliberately absent. */
public record User(Long id, String name, String lastname, String email,
                   OffsetDateTime createdAt, OffsetDateTime updatedAt) {
}
