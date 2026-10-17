package com.example.jdbclab.auth.application;

public interface PasswordHasher {
    String hash(String password);
}
