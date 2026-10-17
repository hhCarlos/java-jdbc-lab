package com.example.jdbclab.users.infrastructure.persistence;

import com.example.jdbclab.users.domain.User;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class JdbcUserRepositoryTest {
    private JdbcTemplate jdbc;
    private JdbcUserRepository repository;
    private final OffsetDateTime created = OffsetDateTime.parse("2026-10-15T10:15:30-06:00");
    private final OffsetDateTime updated = OffsetDateTime.parse("2026-10-15T11:45:00-06:00");

    @BeforeEach
    void setUp() {
        jdbc = spy(new JdbcTemplate(new DriverManagerDataSource(
                "jdbc:h2:mem:" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1", "sa", "")));
        jdbc.execute("""
                CREATE TABLE users (
                    id NUMBER PRIMARY KEY, name VARCHAR2(50), lastname VARCHAR2(50),
                    email VARCHAR2(254), password_hash VARCHAR2(512),
                    created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE)
                """);
        repository = new JdbcUserRepository(jdbc);
    }

    private void insert(long id) {
        jdbc.update("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)",
                id, "Ana", "Lopez", "ana" + id + "@example.test", "private-hash", created, updated);
    }

    @Test
    void returnsEmptyResultsForEmptyTable() {
        assertThat(repository.findAll()).isEmpty();
        assertThat(repository.findById(123L)).isEmpty();
    }

    @Test
    void mapsColumnsAndOrdersByIdWithoutSelectingCredentials() {
        insert(8);
        insert(2);
        var users = repository.findAll();
        assertThat(users).extracting(user -> user.id()).containsExactly(2L, 8L);
        var user = users.get(0);
        assertThat(user.name()).isEqualTo("Ana");
        assertThat(user.lastname()).isEqualTo("Lopez");
        assertThat(user.email()).isEqualTo("ana2@example.test");
        assertThat(user.createdAt()).isEqualTo(created);
        assertThat(user.updatedAt()).isEqualTo(updated);
        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).query(sql.capture(), ArgumentMatchers.<RowMapper<User>>any());
        assertThat(sql.getValue().toLowerCase()).doesNotContain("password_hash", "*")
                .endsWith("order by id");
    }

    @Test
    void looksUpOnlyRequestedIdUsingBindParameterAndPublicColumns() {
        insert(2);
        insert(8);
        assertThat(repository.findById(8L)).hasValueSatisfying(user -> {
            assertThat(user.id()).isEqualTo(8L);
            assertThat(user.createdAt()).isEqualTo(created);
            assertThat(user.updatedAt()).isEqualTo(updated);
        });
        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).query(sql.capture(), ArgumentMatchers.<RowMapper<User>>any(), eq(8L));
        assertThat(sql.getValue().toLowerCase()).contains("where id = ?")
                .doesNotContain("password_hash", "*").endsWith("order by id");
        assertThat(repository.findById(99L)).isEmpty();
    }
}
