package com.example.jdbclab.auth.infrastructure.persistence;

import com.example.jdbclab.auth.application.CredentialRepository;
import com.example.jdbclab.auth.application.UserCredentials;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Reuses the shared JdbcTemplate; credential columns stay out of UserRepository. */
@Repository
public class JdbcCredentialRepository implements CredentialRepository {
    private final JdbcTemplate jdbc;

    public JdbcCredentialRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override
    public Optional<UserCredentials> findByEmail(String email) {
        var matches = jdbc.query("SELECT id, password_hash FROM users WHERE LOWER(TRIM(email)) = ?",
                (row, index) -> new UserCredentials(row.getLong("id"), row.getString("password_hash")),
                email);
        // Legacy case variants must never select an arbitrary account.
        return matches.size() == 1 ? Optional.of(matches.get(0)) : Optional.empty();
    }
}
