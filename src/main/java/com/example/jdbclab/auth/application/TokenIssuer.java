package com.example.jdbclab.auth.application;

public interface TokenIssuer {
    AccessToken issue(Long userId);
}
