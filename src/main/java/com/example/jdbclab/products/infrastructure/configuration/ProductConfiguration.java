package com.example.jdbclab.products.infrastructure.configuration;

import com.example.jdbclab.products.application.ProductRepository;
import com.example.jdbclab.products.application.ProductService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class ProductConfiguration {
    @Bean
    ProductService productService(ProductRepository repository) {
        return new TransactionalProductService(repository);
    }
}
