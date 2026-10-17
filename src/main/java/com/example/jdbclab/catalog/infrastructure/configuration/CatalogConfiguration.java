package com.example.jdbclab.catalog.infrastructure.configuration;

import com.example.jdbclab.catalog.application.CatalogRepository;
import com.example.jdbclab.catalog.application.CatalogService;
import com.example.jdbclab.catalog.infrastructure.web.CatalogController;
import java.util.List;
import org.springdoc.core.customizers.OperationCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CatalogConfiguration {
    @Bean
    OperationCustomizer publicCatalogOperations() {
        return (operation, handler) -> {
            if (handler.getBeanType() == CatalogController.class) {
                // Explicit [] overrides any document-level bearer requirement.
                operation.setSecurity(List.of());
            }
            return operation;
        };
    }

    @Bean
    CatalogService catalogService(CatalogRepository repository) {
        return new CatalogService(repository);
    }
}
