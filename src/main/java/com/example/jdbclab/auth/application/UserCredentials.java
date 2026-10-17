package com.example.jdbclab.auth.application;

/** Credential projection used only by login, never by public user reads. */
public record UserCredentials(Long id, String passwordHash) {
    @Override public String toString() { return "UserCredentials[redacted]"; }
}
