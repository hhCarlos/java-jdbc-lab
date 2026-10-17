package com.example.jdbclab.users.infrastructure.configuration;

import com.example.jdbclab.users.infrastructure.database.DevelopmentDatabaseReset;
import javax.sql.DataSource;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;

@Configuration
@Profile("dev & !prod")
public class DevDatabaseConfiguration {
    @Bean
    @ConditionalOnProperty(name = "app.dev-db-reset", havingValue = "true")
    DevelopmentDatabaseReset developmentDatabaseReset(DataSource dataSource, Environment environment) {
        return new DevelopmentDatabaseReset(dataSource, environment);
    }
}
