package com.example.jdbclab.users.infrastructure.persistence;

import com.example.jdbclab.users.application.EmailAlreadyExistsException;
import com.example.jdbclab.users.application.RegistrationRepository;
import com.example.jdbclab.users.application.UserRepository;
import com.example.jdbclab.users.domain.User;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class JdbcUserRepository implements UserRepository, RegistrationRepository {
    private static final String COLUMNS = "id, name, lastname, email, created_at, updated_at";
    private static final RowMapper<User> ROW_MAPPER = (row, rowNumber) -> new User(
            row.getLong("id"), row.getString("name"), row.getString("lastname"),
            row.getString("email"), row.getObject("created_at", OffsetDateTime.class),
            row.getObject("updated_at", OffsetDateTime.class));

    private final JdbcTemplate jdbcTemplate;

    public JdbcUserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<User> findAll() {
        return jdbcTemplate.query("SELECT " + COLUMNS + " FROM users ORDER BY id", ROW_MAPPER);
    }

    @Override
    public Optional<User> findById(Long id) {
        return jdbcTemplate.query("SELECT " + COLUMNS + " FROM users WHERE id = ? ORDER BY id",
                ROW_MAPPER, id).stream().findFirst();
    }

    @Override
    public boolean emailExists(String normalizedEmail) {
        return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM users WHERE LOWER(TRIM(email)) = ?",
                Long.class, normalizedEmail) > 0;
    }

    @Override
    @Transactional
    public User insert(String name, String lastname, String normalizedEmail, String passwordHash) {
        var keys = new GeneratedKeyHolder();
        try {
            jdbcTemplate.update(connection -> {
                // Explicit key column avoids Oracle returning ROWID for generated keys.
                var statement = connection.prepareStatement(
                        "INSERT INTO users (name, lastname, email, password_hash) VALUES (?, ?, ?, ?)",
                        new String[]{"ID"});
                statement.setString(1, name);
                statement.setString(2, lastname);
                statement.setString(3, normalizedEmail);
                statement.setString(4, passwordHash);
                return statement;
            }, keys);
        } catch (DuplicateKeyException exception) {
            // A concurrent normalized-email insert can win after the service precheck.
            if (emailExists(normalizedEmail)) throw new EmailAlreadyExistsException();
            throw exception;
        }
        Number id = keys.getKey();
        if (id == null) throw new IllegalStateException("Registration did not return a generated user ID.");
        return findById(id.longValue()).orElseThrow(
                () -> new IllegalStateException("Registered user could not be read."));
    }

}
