package com.example.jdbclab.catalog.infrastructure.persistence;

import com.example.jdbclab.catalog.application.CatalogRepository;
import com.example.jdbclab.catalog.domain.CatalogProduct;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcCatalogRepository implements CatalogRepository {
    private static final String COLUMNS = "id, title, price, description, stock";
    private static final RowMapper<CatalogProduct> ROW_MAPPER = (row, number) -> new CatalogProduct(
            row.getLong("id"), row.getString("title"), row.getBigDecimal("price"),
            row.getString("description"), row.getLong("stock"));
    private static final String ACTIVE = "ACTIVE";
    private static final String VISIBLE = "stock > 0 AND status_id IN (SELECT id FROM product_statuses WHERE code = ?)";
    private final JdbcTemplate jdbc;

    public JdbcCatalogRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<CatalogProduct> findAll(long offset, int limit) {
        if (offset < 0 || limit < 1 || limit > 100) {
            throw new IllegalArgumentException("Expected a non-negative offset and limit between 1 and 100.");
        }
        return jdbc.query("SELECT " + COLUMNS + " FROM products WHERE " + VISIBLE + " ORDER BY id OFFSET ? ROWS FETCH NEXT ? ROWS ONLY",
                ROW_MAPPER, ACTIVE, offset, limit);
    }

    @Override
    public Optional<CatalogProduct> findById(Long id) {
        return jdbc.query("SELECT " + COLUMNS + " FROM products WHERE id = ? AND " + VISIBLE, ROW_MAPPER, id, ACTIVE)
                .stream().findFirst();
    }
}
