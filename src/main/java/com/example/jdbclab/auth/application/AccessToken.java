package com.example.jdbclab.auth.application;

public record AccessToken(String value, long expiresIn) {
    @Override public String toString() { return "AccessToken[redacted]"; }
}
