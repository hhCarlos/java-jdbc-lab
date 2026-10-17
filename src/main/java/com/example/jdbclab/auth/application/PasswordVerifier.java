package com.example.jdbclab.auth.application;

public interface PasswordVerifier {
    /** A null stored hash performs a dummy verification for an unknown account. */
    boolean matches(String password, String storedHash);
}
