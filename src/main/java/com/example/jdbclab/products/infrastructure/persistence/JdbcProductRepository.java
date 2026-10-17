package com.example.jdbclab.products.infrastructure.persistence;

import com.example.jdbclab.products.application.ProductRepository;
import com.example.jdbclab.products.domain.OwnedProduct;
import java.util.List;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcProductRepository implements ProductRepository {
    private static final String DELETED = "DELETED";
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
    public List<OwnedProduct> findByOwnerId(Long ownerUserId, long offset, int limit) {
        Objects.requireNonNull(ownerUserId, "Owner user ID is required.");
        if (offset < 0 || limit < 1 || limit > 100) {
            throw new IllegalArgumentException("Expected a non-negative offset and limit between 1 and 100.");
        }
        return jdbc.query(FIND_BY_OWNER, ROW_MAPPER, ownerUserId, DELETED, offset, limit);
    }
}
