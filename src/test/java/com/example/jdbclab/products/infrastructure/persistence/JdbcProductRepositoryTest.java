package com.example.jdbclab.products.infrastructure.persistence;

import com.example.jdbclab.products.domain.OwnedProduct;
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

class JdbcProductRepositoryTest {
    private JdbcTemplate jdbc;
    private JdbcProductRepository repository;

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
        repository = new JdbcProductRepository(jdbc);
    }

    private long insert(long owner, String status, long stock, String description) {
        jdbc.update("""
                INSERT INTO products (user_id, title, price, description, stock, status_id)
                VALUES (?, ?, ?, ?, ?, (SELECT id FROM product_statuses WHERE code = ?))
                """, owner, "Owner's product", new BigDecimal("9999999999.99"), description, stock, status);
        return jdbc.queryForObject("SELECT MAX(id) FROM products", Long.class);
    }

    @Test
    void findsOwnersProductAndMapsAllEditFields() {
        String description = "Description with ' quotes and ? placeholders ".repeat(200);
        long id = insert(1, "ACTIVE", 7, description);
        assertThat(repository.findByIdAndOwnerId(id, 1L)).contains(new OwnedProduct(
                id, "Owner's product", new BigDecimal("9999999999.99"), description, 7, "ACTIVE"));
    }

    @Test
    void doesNotFindAnotherOwnersMissingOrDeletedProduct() {
        long other = insert(2, "ACTIVE", 3, null);
        long deleted = insert(1, "DELETED", 10, null);
        assertThat(repository.findByIdAndOwnerId(other, 1L)).isEmpty();
        assertThat(repository.findByIdAndOwnerId(Long.MAX_VALUE, 1L)).isEmpty();
        assertThat(repository.findByIdAndOwnerId(deleted, 1L)).isEmpty();
    }

    @Test
    void findsInactiveAndZeroStockProductsUsingStableStatusCodes() {
        jdbc.update("UPDATE product_statuses SET id = ? WHERE code = ?", 11, "ACTIVE");
        jdbc.update("UPDATE product_statuses SET id = ? WHERE code = ?", 22, "INACTIVE");
        jdbc.update("UPDATE product_statuses SET id = ? WHERE code = ?", 33, "DELETED");
        for (String status : new String[]{"ACTIVE", "INACTIVE"}) {
            for (long stock : new long[]{0, 5}) {
                long id = insert(1, status, stock, null);
                assertThat(repository.findByIdAndOwnerId(id, 1L)).contains(new OwnedProduct(
                        id, "Owner's product", new BigDecimal("9999999999.99"), null, stock, status));
            }
        }
        long deleted = insert(1, "DELETED", 0, null);
        assertThat(repository.findByIdAndOwnerId(deleted, 1L)).isEmpty();
    }

    @Test
    void bindsProductOwnerAndDeletedStatusInLookupSql() {
        repository.findByIdAndOwnerId(17L, 2L);
        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).query(sql.capture(), org.mockito.ArgumentMatchers.<RowMapper<OwnedProduct>>any(),
                eq(17L), eq(2L), eq("DELETED"));
        assertThat(sql.getValue()).contains("WHERE p.id = ? AND p.user_id = ? AND s.code <> ?")
                .doesNotContain("stock >", "SELECT *");
    }

    @Test
    void rejectsNullLookupIdsBeforeQuerying() {
        clearInvocations(jdbc);
        assertThatNullPointerException().isThrownBy(() -> repository.findByIdAndOwnerId(null, 1L));
        assertThatNullPointerException().isThrownBy(() -> repository.findByIdAndOwnerId(1L, null));
        verifyNoInteractions(jdbc);
    }

    @Test
    void isolatesOwnersAndIncludesActiveInactiveAndZeroStock() {
        long first = insert(1, "ACTIVE", 0, null);
        long other = insert(2, "ACTIVE", 3, null);
        long second = insert(1, "INACTIVE", 0, null);
        long third = insert(1, "INACTIVE", 5, null);
        insert(1, "DELETED", 10, null);
        insert(2, "DELETED", 0, null);
        assertThat(repository.findByOwnerId(1L, 0, 20)).extracting(OwnedProduct::id)
                .containsExactly(first, second, third);
        assertThat(repository.findByOwnerId(1L, 0, 20)).extracting(OwnedProduct::statusCode)
                .containsExactly("ACTIVE", "INACTIVE", "INACTIVE");
        assertThat(repository.findByOwnerId(2L, 0, 20)).extracting(OwnedProduct::id).containsExactly(other);
    }

    @Test
    void appliesBothFiltersBeforePaginationAndReturnsPartialAndEmptyPages() {
        insert(2, "ACTIVE", 1, null);
        insert(1, "DELETED", 1, null);
        long first = insert(1, "ACTIVE", 0, null);
        insert(2, "INACTIVE", 0, null);
        long second = insert(1, "INACTIVE", 1, null);
        insert(1, "DELETED", 0, null);
        long third = insert(1, "ACTIVE", 1, null);
        assertThat(repository.findByOwnerId(1L, 0, 2)).extracting(OwnedProduct::id).containsExactly(first, second);
        assertThat(repository.findByOwnerId(1L, 2, 2)).extracting(OwnedProduct::id).containsExactly(third);
        assertThat(repository.findByOwnerId(1L, 4, 2)).isEmpty();
        assertThat(repository.findByOwnerId(1L, Long.MAX_VALUE, 100)).isEmpty();
    }

    @Test
    void returnsEmptyForNoProductsOnlyDeletedProductsOrUnknownOwner() {
        assertThat(repository.findByOwnerId(1L, 0, 20)).isEmpty();
        insert(1, "DELETED", 1, null);
        assertThat(repository.findByOwnerId(1L, 0, 20)).isEmpty();
        assertThat(repository.findByOwnerId(2L, 0, 20)).isEmpty();
        assertThat(repository.findByOwnerId(999L, 0, 20)).isEmpty();
    }

    @Test
    void mapsAllFieldsAndUsesStableStatusCodesWithDifferentNumericIds() {
        jdbc.update("UPDATE product_statuses SET id = ? WHERE code = ?", 11, "ACTIVE");
        jdbc.update("UPDATE product_statuses SET id = ? WHERE code = ?", 22, "INACTIVE");
        jdbc.update("UPDATE product_statuses SET id = ? WHERE code = ?", 33, "DELETED");
        String description = "CLOB ' ? ".repeat(1000);
        long id = insert(1, "ACTIVE", 9999999999L, description);
        long inactive = insert(1, "INACTIVE", 0, null);
        insert(1, "DELETED", 9, null);
        var result = repository.findByOwnerId(1L, 0, 100);
        assertThat(result).extracting(OwnedProduct::id).containsExactly(id, inactive);
        assertThat(result.get(0)).isEqualTo(new OwnedProduct(id, "Owner's product",
                new BigDecimal("9999999999.99"), description, 9999999999L, "ACTIVE"));
        assertThat(result.get(1).description()).isNull();
        assertThat(result.get(1).stock()).isZero();
    }

    @Test
    void bindsOwnerStatusOffsetAndLimitWithoutLoadingAccountDetails() {
        repository.findByOwnerId(2L, 7, 20);
        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).query(sql.capture(), org.mockito.ArgumentMatchers.<RowMapper<OwnedProduct>>any(),
                eq(2L), eq("DELETED"), eq(7L), eq(20));
        assertThat(sql.getValue()).contains("WHERE p.user_id = ? AND s.code <> ?",
                        "ORDER BY p.id", "OFFSET ? ROWS FETCH NEXT ? ROWS ONLY")
                .doesNotContain("JOIN users", "stock >", "SELECT *");
    }

    @Test
    void rejectsInvalidPaginationBeforeQuerying() {
        clearInvocations(jdbc);
        assertThatIllegalArgumentException().isThrownBy(() -> repository.findByOwnerId(1L, -1, 20));
        assertThatIllegalArgumentException().isThrownBy(() -> repository.findByOwnerId(1L, 0, 0));
        assertThatIllegalArgumentException().isThrownBy(() -> repository.findByOwnerId(1L, 0, 101));
        assertThatNullPointerException().isThrownBy(() -> repository.findByOwnerId(null, 0, 20));
        verifyNoInteractions(jdbc);
    }

    @Test
    void insertsAndReturnsGeneratedIdAndActualPersistedValues() {
        String description = "Description with ' quotes and ? placeholders ".repeat(200);
        var first = repository.insert(2L, "Owner's product ?", new BigDecimal("123.456"),
                description, 9999999999L, "INACTIVE");
        var second = repository.insert(1L, "Second", new BigDecimal("10.00"), null, 0, "ACTIVE");
        assertThat(first.id()).isPositive();
        assertThat(second.id()).isPositive().isNotEqualTo(first.id());
        assertThat(first.title()).isEqualTo("Owner's product ?");
        assertThat(first.price()).isEqualByComparingTo("123.46");
        assertThat(first.description()).isEqualTo(description);
        assertThat(first.stock()).isEqualTo(9999999999L);
        assertThat(first.statusCode()).isEqualTo("INACTIVE");
        assertThat(jdbc.queryForObject("SELECT user_id FROM products WHERE id = ?", Long.class, first.id()))
                .isEqualTo(2L);
        assertThat(repository.findByOwnerId(2L, 0, 20)).containsExactly(first);
        assertThat(second.description()).isNull();
        assertThat(second.stock()).isZero();
        assertThat(second.statusCode()).isEqualTo("ACTIVE");
    }

    @Test
    void insertResolvesStableStatusCodeAndDoesNotInferStatusFromStock() {
        jdbc.update("UPDATE product_statuses SET id = ? WHERE code = ?", 22, "INACTIVE");
        jdbc.update("UPDATE product_statuses SET id = ? WHERE code = ?", 33, "DELETED");
        var inactive = repository.insert(1L, "Inactive", new BigDecimal("1.00"), null, 5, "INACTIVE");
        assertThat(jdbc.queryForObject("SELECT status_id FROM products WHERE id = ?", Long.class, inactive.id()))
                .isEqualTo(22L);
        var deleted = repository.insert(1L, "Deleted", new BigDecimal("2.00"), null, 0, "DELETED");
        assertThat(deleted.statusCode()).isEqualTo("DELETED");
        assertThat(jdbc.queryForObject("SELECT status_id FROM products WHERE id = ?", Long.class, deleted.id()))
                .isEqualTo(33L);
        assertThat(repository.findByOwnerId(1L, 0, 20)).containsExactly(inactive);
    }

    @Test
    void rejectsNonexistentOwnerWithoutInsertingARow() {
        assertThatThrownBy(() -> repository.insert(999L, "Invalid owner", new BigDecimal("1.00"), null, 0, "ACTIVE"))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM products", Long.class)).isZero();
    }

    @Test
    void rejectsUnknownStatusIncludingSqlTextWithoutInsertingARow() {
        for (String status : new String[]{"UNKNOWN", "ACTIVE' OR '1'='1"}) {
            assertThatThrownBy(() -> repository.insert(1L, "Invalid status", new BigDecimal("1.00"), null, 0, status))
                    .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM products", Long.class)).isZero();
    }

    @Test
    void updatesAllFieldsAndStatusUsingStableCodesAndPreservesIdentityAndOwnership() {
        jdbc.update("UPDATE product_statuses SET id = ? WHERE code = ?", 11, "ACTIVE");
        jdbc.update("UPDATE product_statuses SET id = ? WHERE code = ?", 22, "INACTIVE");
        long id = insert(1, "ACTIVE", 7, "Old description");
        String description = "CLOB with ' and ? ".repeat(1000);
        assertThat(repository.update(id, 1L, "Replacement ' ?", new BigDecimal("123.45"),
                description, 9999999999L, "INACTIVE")).isEqualTo(1);
        assertThat(repository.findByIdAndOwnerId(id, 1L)).contains(new OwnedProduct(
                id, "Replacement ' ?", new BigDecimal("123.45"), description, 9999999999L, "INACTIVE"));
        assertThat(jdbc.queryForObject("SELECT user_id FROM products WHERE id = ?", Long.class, id)).isEqualTo(1L);
        assertThat(jdbc.queryForObject("SELECT status_id FROM products WHERE id = ?", Long.class, id)).isEqualTo(22L);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM products", Long.class)).isEqualTo(1L);
    }

    @Test
    void updatesInactiveProductAndClearsDescriptionWithoutInferringStatusFromStock() {
        long id = insert(1, "INACTIVE", 4, "Clear this");
        assertThat(repository.update(id, 1L, "Updated", new BigDecimal("0.00"), null, 0, "ACTIVE")).isEqualTo(1);
        assertThat(repository.findByIdAndOwnerId(id, 1L)).contains(new OwnedProduct(
                id, "Updated", new BigDecimal("0.00"), null, 0, "ACTIVE"));
    }

    @Test
    void cannotUpdateAnotherOwnersProduct() {
        long id = insert(2, "ACTIVE", 3, "Original");
        var before = repository.findByIdAndOwnerId(id, 2L);
        assertThat(repository.update(id, 1L, "Changed", BigDecimal.ONE, null, 0, "INACTIVE")).isZero();
        assertThat(repository.findByIdAndOwnerId(id, 2L)).isEqualTo(before);
        assertThat(jdbc.queryForObject("SELECT user_id FROM products WHERE id = ?", Long.class, id)).isEqualTo(2L);
    }

    @Test
    void missingAndDeletedProductsAreNeverUpdatedOrInserted() {
        long id = insert(1, "DELETED", 8, "Keep this");
        for (String status : new String[]{"ACTIVE", "INACTIVE", "DELETED"}) {
            assertThat(repository.update(id, 1L, "Changed", BigDecimal.ONE, null, 0, status)).isZero();
            assertThat(repository.update(Long.MAX_VALUE, 1L, "Missing", BigDecimal.ONE, null, 0, status)).isZero();
        }
        var stored = jdbc.queryForObject("""
                SELECT p.*, s.code FROM products p JOIN product_statuses s ON s.id = p.status_id
                WHERE p.id = ?
                """, (row, number) -> new OwnedProduct(row.getLong("id"), row.getString("title"),
                row.getBigDecimal("price"), row.getString("description"), row.getLong("stock"),
                row.getString("code")), id);
        assertThat(stored).isEqualTo(new OwnedProduct(id, "Owner's product",
                new BigDecimal("9999999999.99"), "Keep this", 8, "DELETED"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM products", Long.class)).isEqualTo(1L);
    }

    @Test
    void invalidTargetStatusFailsWithoutChangingAnyProductFields() {
        long id = insert(1, "ACTIVE", 5, "Original");
        var before = repository.findByIdAndOwnerId(id, 1L);
        for (String status : new String[]{"UNKNOWN", "ACTIVE' OR '1'='1"}) {
            assertThatThrownBy(() -> repository.update(id, 1L, "Changed", BigDecimal.ONE, null, 0, status))
                    .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
            assertThat(repository.findByIdAndOwnerId(id, 1L)).isEqualTo(before);
        }
    }

    @Test
    void bindsAllUpdateValuesAndOwnerAndAllowedCurrentStatusesInOneStatement() {
        var updateJdbc = mock(JdbcTemplate.class);
        var updateRepository = new JdbcProductRepository(updateJdbc);
        updateRepository.update(17L, 2L, "Title", new BigDecimal("12.34"), null, 8, "INACTIVE");
        var sql = ArgumentCaptor.forClass(String.class);
        verify(updateJdbc).update(sql.capture(), eq("Title"), eq(new BigDecimal("12.34")), isNull(),
                eq(8L), eq("INACTIVE"), eq(17L), eq(2L), eq("ACTIVE"), eq("INACTIVE"));
        assertThat(sql.getValue()).contains("SET title = ?, price = ?, description = ?, stock = ?",
                "status_id = (SELECT id FROM product_statuses WHERE code = ?)",
                "WHERE id = ? AND user_id = ?",
                "AND status_id IN (SELECT id FROM product_statuses WHERE code IN (?, ?))");
        verifyNoMoreInteractions(updateJdbc);
    }
}
