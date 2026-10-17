package com.example.jdbclab.users.application;

import com.example.jdbclab.users.domain.User;

public interface RegistrationRepository {
    boolean emailExists(String normalizedEmail);
    User insert(String name, String lastname, String normalizedEmail, String passwordHash);
}
