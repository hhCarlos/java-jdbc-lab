package com.example.jdbclab.auth.infrastructure.persistence;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import static org.assertj.core.api.Assertions.*;

class JdbcCredentialRepositoryTest {
    @Test
    void credentialLookupBindsEmailAndLeavesStoredHashUntouched() {
        var jdbc = new JdbcTemplate(new DriverManagerDataSource("jdbc:h2:mem:" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1", "sa", ""));
        jdbc.execute("CREATE TABLE users (id BIGINT PRIMARY KEY, email VARCHAR(254) UNIQUE, password_hash VARCHAR(512))");
        String hash = "$2b$10$storedHashIsAnOpaqueValueForTheJdbcAdapter";
        jdbc.update("INSERT INTO users VALUES (?, ?, ?)", 7, "ana@example.test", hash);
        var repository = new JdbcCredentialRepository(jdbc);
        assertThat(repository.findByEmail("ana@example.test")).hasValueSatisfying(user -> {
            assertThat(user.id()).isEqualTo(7L);
            assertThat(user.passwordHash()).isEqualTo(hash);
            assertThat(user.toString()).doesNotContain(hash);
        });
        assertThat(repository.findByEmail("missing@example.test")).isEmpty();
        assertThat(repository.findByEmail("' OR '1'='1")).isEmpty();
        assertThat(jdbc.queryForObject("SELECT password_hash FROM users WHERE id = 7", String.class)).isEqualTo(hash);
    }
}
