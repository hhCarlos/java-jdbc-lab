package com.example.jdbclab.catalog.infrastructure.persistence;

import com.example.jdbclab.catalog.domain.CatalogProduct;
import com.example.jdbclab.catalog.application.CatalogService;
import com.example.jdbclab.catalog.infrastructure.web.CatalogController;
import com.example.jdbclab.infrastructure.web.ApiExceptionHandler;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class JdbcCatalogRepositoryTest {
    private JdbcTemplate jdbc;
    private JdbcCatalogRepository repository;

    @BeforeEach
    void setUp() throws Exception {
        jdbc = spy(new JdbcTemplate(new DriverManagerDataSource(
                "jdbc:h2:mem:" + UUID.randomUUID() + ";MODE=Oracle;DB_CLOSE_DELAY=-1", "sa", "")));
        jdbc.execute("CREATE TABLE users (id NUMBER PRIMARY KEY)");
        for (String file : new String[]{"product_statuses.sql", "product_statuses_seed.sql", "products.sql"}) {
            for (String sql : Files.readString(Path.of("infra/database/tables/" + file)).split(";")) {
                if (!sql.isBlank()) jdbc.execute(sql);
            }
        }
        jdbc.update("INSERT INTO users VALUES (?)", 1L);
        jdbc.update("INSERT INTO users VALUES (?)", 2L);
        repository = new JdbcCatalogRepository(jdbc);
    }

    private long insert(long owner, String title, String description, long stock) {
        jdbc.update("INSERT INTO products (user_id, title, price, description, stock, status_id) VALUES (?, ?, ?, ?, ?, (SELECT id FROM product_statuses WHERE code = 'ACTIVE'))",
                owner, title, new BigDecimal("9999999999.99"), description, stock);
        return jdbc.queryForObject("SELECT MAX(id) FROM products", Long.class);
    }

    @Test
    void listsAllOwnersInIdOrderWithOnlyPublicColumns() {
        long first = insert(2L, "Second owner", "Description", 9999999999L);
        long second = insert(1L, "First owner", null, 1);
        assertThat(repository.findAll(0, 20)).extracting(CatalogProduct::id).containsExactly(first, second);
        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).query(sql.capture(), org.mockito.ArgumentMatchers.<RowMapper<CatalogProduct>>any(), eq("ACTIVE"), eq(0L), eq(20));
        assertThat(sql.getValue()).startsWith("SELECT id, title, price, description, stock FROM products")
                .contains("ORDER BY id OFFSET ? ROWS FETCH NEXT ? ROWS ONLY")
                .contains("stock > 0", "code = ?").doesNotContain("user_id", "users", "JOIN", "*");
    }

    @Test
    void paginatesWithoutOverlapAndReturnsPartialOrEmptyPages() {
        long first = insert(1L, "A", null, 1);
        long second = insert(2L, "B", null, 1);
        long third = insert(1L, "C", null, 1);
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
        verify(jdbc).query(contains("FROM products WHERE id = ? AND"),
                org.mockito.ArgumentMatchers.<RowMapper<CatalogProduct>>any(), eq(id), eq("ACTIVE"));
        long nullable = insert(1L, "Other", null, 1);
        assertThat(repository.findById(nullable)).hasValueSatisfying(product -> assertThat(product.description()).isNull());
        assertThat(repository.findById(999L)).isEmpty();
    }

    @Test
    void filtersHiddenProductsBeforePaginationAndReturns404ForEachHiddenId() throws Exception {
        long paused = insert(1L, "Paused", null, 5);
        jdbc.update("UPDATE products SET status_id = (SELECT id FROM product_statuses WHERE code = ?) WHERE id = ?", "INACTIVE", paused);
        long first = insert(2L, "Visible A", null, 1);
        long deleted = insert(2L, "Deleted", null, 10);
        jdbc.update("UPDATE products SET status_id = (SELECT id FROM product_statuses WHERE code = ?) WHERE id = ?", "DELETED", deleted);
        long zero = insert(1L, "Zero", null, 0);
        long second = insert(1L, "Visible B", null, 2);
        long third = insert(2L, "Visible C", null, 3);
        assertThat(repository.findAll(0, 2)).extracting(CatalogProduct::id).containsExactly(first, second);
        assertThat(repository.findAll(2, 2)).extracting(CatalogProduct::id).containsExactly(third);
        assertThat(repository.findAll(3, 2)).isEmpty();
        assertThat(repository.findAll(0, 100)).hasSize(3);
        var mvc = MockMvcBuilders.standaloneSetup(
                new CatalogController(
                        new CatalogService(repository)))
                .setControllerAdvice(new ApiExceptionHandler()).build();
        for (long hidden : new long[]{paused, deleted, zero}) {
            assertThat(repository.findById(hidden)).isEmpty();
            mvc.perform(get("/catalog/products/" + hidden))
                    .andExpect(status().isNotFound());
        }
        // Restocking changes neither publication state nor visibility.
        jdbc.update("UPDATE products SET stock = ? WHERE id IN (?, ?)", 20, paused, deleted);
        assertThat(repository.findById(paused)).isEmpty();
        assertThat(repository.findById(deleted)).isEmpty();
    }

    @Test
    void newRowsDefaultToInactiveEvenWithPositiveStock() {
        jdbc.update("INSERT INTO products (user_id, title, price, stock) VALUES (?, ?, ?, ?)", 1, "Default", 1, 5);
        assertThat(repository.findAll(0, 20)).isEmpty();
        assertThat(jdbc.queryForObject("SELECT s.code FROM products p JOIN product_statuses s ON s.id = p.status_id", String.class))
                .isEqualTo("INACTIVE");
    }
    @Test
    void resolvesVisibilityByStableCodeRatherThanNumericId() {
        jdbc.update("UPDATE product_statuses SET id = ? WHERE code = ?", 11, "ACTIVE");
        long id = insert(1L, "Visible", null, 3);
        assertThat(repository.findById(id)).isPresent();
        assertThat(repository.findAll(0, 20)).extracting(CatalogProduct::id).containsExactly(id);
    }
}
