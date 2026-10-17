package com.example.jdbclab.auth.application;

import java.util.Optional;

public interface CredentialRepository {
    Optional<UserCredentials> findByEmail(String email);
}
