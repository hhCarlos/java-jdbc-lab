package com.example.jdbclab.products.infrastructure.persistence;

import com.example.jdbclab.products.application.ProductRepository;
import com.example.jdbclab.products.domain.OwnedProduct;
import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class JdbcProductRepository implements ProductRepository {
    private static final String DELETED = "DELETED";
    private static final String FIND_BY_ID_AND_OWNER = """
            SELECT p.id, p.title, p.price, p.description, p.stock, s.code AS status_code
            FROM products p
            JOIN product_statuses s ON s.id = p.status_id
            WHERE p.id = ? AND p.user_id = ? AND s.code <> ?
            """;
    private static final String FIND_BY_OWNER = """
            SELECT p.id, p.title, p.price, p.description, p.stock, s.code AS status_code
            FROM products p
            JOIN product_statuses s ON s.id = p.status_id
            WHERE p.user_id = ? AND s.code <> ?
            ORDER BY p.id
            OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
            """;
    private static final RowMapper<OwnedProduct> ROW_MAPPER = (row, number) -> new OwnedProduct(
            row.getLong("id"), row.getString("title"), row.getBigDecimal("price"),
            row.getString("description"), row.getLong("stock"), row.getString("status_code"));
    private final JdbcTemplate jdbc;

    public JdbcProductRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<OwnedProduct> findByIdAndOwnerId(Long productId, Long ownerUserId) {
        Objects.requireNonNull(productId, "Product ID is required.");
        Objects.requireNonNull(ownerUserId, "Owner user ID is required.");
        return jdbc.query(FIND_BY_ID_AND_OWNER, ROW_MAPPER, productId, ownerUserId, DELETED)
                .stream().findFirst();
    }

    @Override
    public List<OwnedProduct> findByOwnerId(Long ownerUserId, long offset, int limit) {
        Objects.requireNonNull(ownerUserId, "Owner user ID is required.");
        if (offset < 0 || limit < 1 || limit > 100) {
            throw new IllegalArgumentException("Expected a non-negative offset and limit between 1 and 100.");
        }
        return jdbc.query(FIND_BY_OWNER, ROW_MAPPER, ownerUserId, DELETED, offset, limit);
    }

    @Override
    @Transactional
    public OwnedProduct insert(Long ownerUserId, String title, BigDecimal price, String description,
                               long stock, String statusCode) {
        var keys = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            // Request the ID column explicitly: Oracle otherwise may return ROWID.
            var statement = connection.prepareStatement("""
                    INSERT INTO products (user_id, title, price, description, stock, status_id)
                    VALUES (?, ?, ?, ?, ?, (SELECT id FROM product_statuses WHERE code = ?))
                    """, new String[]{"ID"});
            statement.setObject(1, ownerUserId, java.sql.Types.NUMERIC);
            statement.setString(2, title);
            statement.setBigDecimal(3, price);
            statement.setString(4, description);
            statement.setLong(5, stock);
            statement.setString(6, statusCode);
            return statement;
        }, keys);
        Number id = keys.getKey();
        if (id == null) throw new IllegalStateException("Product insert did not return a generated ID.");
        // Read back persisted values, including database price precision and the supplied status.
        // This lookup must also work for DELETED products excluded from owner listings.
        return jdbc.query("""
                SELECT p.id, p.title, p.price, p.description, p.stock, s.code AS status_code
                FROM products p
                JOIN product_statuses s ON s.id = p.status_id
                WHERE p.id = ?
                """, ROW_MAPPER, id.longValue()).stream().findFirst().orElseThrow(
                        () -> new IllegalStateException("Inserted product could not be read."));
    }

}
