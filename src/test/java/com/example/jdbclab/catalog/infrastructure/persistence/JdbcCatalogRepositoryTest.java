package com.example.jdbclab.catalog.infrastructure.persistence;

import com.example.jdbclab.catalog.domain.CatalogProduct;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class JdbcCatalogRepositoryTest {
    private JdbcTemplate jdbc;
    private JdbcCatalogRepository repository;

    @BeforeEach
    void setUp() throws Exception {
        jdbc = spy(new JdbcTemplate(new DriverManagerDataSource(
                "jdbc:h2:mem:" + UUID.randomUUID() + ";MODE=Oracle;DB_CLOSE_DELAY=-1", "sa", "")));
        jdbc.execute("CREATE TABLE users (id NUMBER PRIMARY KEY)");
        for (String sql : Files.readString(Path.of("infra/database/tables/products.sql")).split(";")) {
            if (!sql.isBlank()) jdbc.execute(sql);
        }
        jdbc.update("INSERT INTO users VALUES (?)", 1L);
        jdbc.update("INSERT INTO users VALUES (?)", 2L);
        repository = new JdbcCatalogRepository(jdbc);
    }

    private long insert(long owner, String title, String description, long stock) {
        jdbc.update("INSERT INTO products (user_id, title, price, description, stock) VALUES (?, ?, ?, ?, ?)",
                owner, title, new BigDecimal("9999999999.99"), description, stock);
        return jdbc.queryForObject("SELECT MAX(id) FROM products", Long.class);
    }

    @Test
    void listsAllOwnersInIdOrderWithOnlyPublicColumns() {
        long first = insert(2L, "Second owner", "Description", 9999999999L);
        long second = insert(1L, "First owner", null, 0);
        assertThat(repository.findAll(0, 20)).extracting(CatalogProduct::id).containsExactly(first, second);
        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).query(sql.capture(), org.mockito.ArgumentMatchers.<RowMapper<CatalogProduct>>any(), eq(0L), eq(20));
        assertThat(sql.getValue()).startsWith("SELECT id, title, price, description, stock FROM products")
                .contains("ORDER BY id OFFSET ? ROWS FETCH NEXT ? ROWS ONLY")
                .doesNotContain("user_id", "users", "JOIN", "*");
    }

    @Test
    void paginatesWithoutOverlapAndReturnsPartialOrEmptyPages() {
        long first = insert(1L, "A", null, 0);
        long second = insert(2L, "B", null, 0);
        long third = insert(1L, "C", null, 0);
        assertThat(repository.findAll(0, 2)).extracting(CatalogProduct::id).containsExactly(first, second);
        assertThat(repository.findAll(2, 2)).extracting(CatalogProduct::id).containsExactly(third);
        assertThat(repository.findAll(4, 2)).isEmpty();
    }

    @Test
    void returnsEmptyResultsForEmptyCatalog() {
        assertThat(repository.findAll(0, 20)).isEmpty();
        assertThat(repository.findById(99L)).isEmpty();
    }

    @Test
    void mapsPriceClobAndFullStockRangeAndBindsLookupId() {
        String description = "Large CLOB ' ? ".repeat(1000);
        long id = insert(2L, "Book", description, 9999999999L);
        assertThat(repository.findById(id)).hasValueSatisfying(product -> {
            assertThat(product.id()).isEqualTo(id);
            assertThat(product.title()).isEqualTo("Book");
            assertThat(product.price()).isEqualByComparingTo("9999999999.99");
            assertThat(product.description()).isEqualTo(description);
            assertThat(product.stock()).isEqualTo(9999999999L);
        });
        verify(jdbc).query(eq("SELECT id, title, price, description, stock FROM products WHERE id = ?"),
                org.mockito.ArgumentMatchers.<RowMapper<CatalogProduct>>any(), eq(id));
        long nullable = insert(1L, "Other", null, 0);
        assertThat(repository.findById(nullable)).hasValueSatisfying(product -> assertThat(product.description()).isNull());
        assertThat(repository.findById(999L)).isEmpty();
    }
}
