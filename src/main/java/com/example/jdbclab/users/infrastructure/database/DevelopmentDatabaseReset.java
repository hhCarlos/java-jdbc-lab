package com.example.jdbclab.users.infrastructure.database;

import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.OffsetDateTime;
import javax.sql.DataSource;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

/** Explicitly destructive local development operation, excluded from production. */
public class DevelopmentDatabaseReset implements ApplicationRunner {
    private final DataSource dataSource;
    private final Environment environment;

    public DevelopmentDatabaseReset(DataSource dataSource, Environment environment) {
        this.dataSource = dataSource;
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (!environment.acceptsProfiles(Profiles.of("dev & !prod"))
                || !environment.getProperty("app.dev-db-reset", Boolean.class, false)) {
            throw new IllegalStateException("Database reset requires dev without prod and an explicit reset flag.");
        }
        // Load the canonical DDL before touching data. SQL*Plus setup uses this same file.
        String usersDdl = new ClassPathResource("db/tables/users.sql")
                .getContentAsString(StandardCharsets.UTF_8).strip().replaceFirst(";\\s*$", "");
        String productsDdl = new ClassPathResource("db/tables/products.sql")
                .getContentAsString(StandardCharsets.UTF_8);
        try (Connection connection = dataSource.getConnection()) {
            String url = connection.getMetaData().getURL();
            if (url == null || !url.matches("(?i)jdbc:oracle:thin:@//(localhost|127\\.0\\.0\\.1|\\[::1\\]):[0-9]+/FREEPDB1")
                    || !"Oracle".equals(connection.getMetaData().getDatabaseProductName())
                    || !"STORE_JDBC".equalsIgnoreCase(connection.getMetaData().getUserName())) {
                throw new IllegalStateException("Reset requires local Oracle STORE_JDBC on FREEPDB1.");
            }
            JdbcTemplate jdbc = new JdbcTemplate(new SingleConnectionDataSource(connection, true));
            String identity = jdbc.queryForObject("""
                    SELECT SYS_CONTEXT('USERENV', 'SESSION_USER') || ':' ||
                           SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA') || ':' ||
                           SYS_CONTEXT('USERENV', 'CON_NAME') FROM DUAL
                    """, String.class);
            if (!"STORE_JDBC:STORE_JDBC:FREEPDB1".equals(identity)) {
                throw new IllegalStateException("Reset refused: unexpected session user, schema or PDB.");
            }
            // Fixed allowlist: never enumerate/drop arbitrary tables or cascade to other objects.
            try (Statement statement = connection.createStatement()) {
                for (String table : new String[]{"PRODUCTS", "USERS"}) {
                    try {
                        statement.execute("DROP TABLE STORE_JDBC." + table + " PURGE");
                    } catch (SQLException exception) {
                        if (exception.getErrorCode() != 942) {
                            throw exception;
                        }
                    }
                }
                statement.execute(usersDdl);
                for (String sql : productsDdl.split(";")) {
                    if (!sql.isBlank()) {
                        statement.execute(sql.strip());
                    }
                }
            }
            // Oracle DDL commits implicitly; only seed DML can be rolled back.
            connection.setAutoCommit(false);
            try {
                seed(jdbc);
                connection.commit();
            } catch (RuntimeException | SQLException exception) {
                connection.rollback();
                throw exception;
            }
        }
    }

    private void seed(JdbcTemplate jdbc) {
        OffsetDateTime timestamp = OffsetDateTime.parse("2026-01-01T00:00:00Z");
        String sql = """
                INSERT INTO users (name, lastname, email, password_hash, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """;
        // Fixed PBKDF2-SHA256 encodings of discarded random inputs; no plaintext credentials.
        jdbc.update(sql, "Ana", "Lopez", "ana@example.test", SAMPLE_HASH_ANA, timestamp, timestamp);
        jdbc.update(sql, "Luis", "Garcia", "luis@example.test", SAMPLE_HASH_LUIS, timestamp, timestamp);
    }

    private static final String SAMPLE_HASH_ANA = "pbkdf2-sha256$600000$0Ae3RHQS2xdkfsHZdjhlng==$66LFy4OKa9B/3EvR5R49ByV46IRW9+a4wqVeUvLCWMg=";
    private static final String SAMPLE_HASH_LUIS = "pbkdf2-sha256$600000$tTpOmNlWhevvstoz+QYuew==$YSocDi838uwGtIATTHWdvayp0/hCa9UM0rsqRzhXt5E=";
}
