package com.example.jdbclab;

import com.example.jdbclab.infrastructure.JdbcLabApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = JdbcLabApplication.class, properties = {
        "spring.profiles.active=",
        "app.dev-db-reset=false",
        "spring.datasource.url=jdbc:h2:mem:foundation;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver"
})
class FoundationTest {
    @DynamicPropertySource
    static void signingKey(DynamicPropertyRegistry properties) {
        properties.add("auth.jwt.secret", () -> TEST_KEY);
    }

    private static final String TEST_KEY = TestJwtSigning.randomSecret();
    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void contextProvidesWorkingJdbcTemplate() {
        assertThat(jdbcTemplate.queryForObject("SELECT 1", Integer.class)).isEqualTo(1);
    }
}
