package com.example.jdbclab.catalog.infrastructure.configuration;

import com.example.jdbclab.catalog.application.CatalogRepository;
import com.example.jdbclab.catalog.application.CatalogService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CatalogConfiguration {
    @Bean
    CatalogService catalogService(CatalogRepository repository) {
        return new CatalogService(repository);
    }
}
