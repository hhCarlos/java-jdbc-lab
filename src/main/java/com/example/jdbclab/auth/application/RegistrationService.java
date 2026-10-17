package com.example.jdbclab.auth.application;

import com.example.jdbclab.auth.domain.EmailAddress;
import com.example.jdbclab.users.application.EmailAlreadyExistsException;
import com.example.jdbclab.users.application.RegistrationRepository;
import com.example.jdbclab.users.domain.User;

/** Registration creates a user, without issuing a token or altering existing accounts. */
public class RegistrationService {
    private final RegistrationRepository users;
    private final PasswordHasher passwords;

    public RegistrationService(RegistrationRepository users, PasswordHasher passwords) {
        this.users = users;
        this.passwords = passwords;
    }

    public User register(String name, String lastname, String email, String password) {
        String normalized = EmailAddress.normalize(email);
        if (users.emailExists(normalized)) {
            throw new EmailAlreadyExistsException();
        }
        return users.insert(name, lastname, normalized, passwords.hash(password));
    }
}
