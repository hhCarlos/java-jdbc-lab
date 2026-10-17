package com.example.jdbclab.auth.infrastructure.web;

import java.nio.charset.StandardCharsets;

/** BCrypt accepts at most 72 UTF-8 bytes; validation never trims or truncates passwords. */
final class PasswordInput {
    private PasswordInput() { }

    static boolean isWithinBcryptLimit(String password) {
        return password == null || password.getBytes(StandardCharsets.UTF_8).length <= 72;
    }
}
