package com.example.jdbclab.auth.infrastructure.password;

import com.example.jdbclab.auth.application.PasswordVerifier;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;

public class BcryptPasswordVerifier implements PasswordVerifier {
    private final PasswordEncoder encoder;
    private final String dummyHash;

    public BcryptPasswordVerifier(PasswordEncoder encoder) {
        this.encoder = encoder;
        this.dummyHash = encoder.encode(UUID.randomUUID().toString());
    }

    @Override
    public boolean matches(String password, String storedHash) {
        boolean matches = encoder.matches(password, storedHash == null ? dummyHash : storedHash);
        return storedHash != null && matches;
    }
}
