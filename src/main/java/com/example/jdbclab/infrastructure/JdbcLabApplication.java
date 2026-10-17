package com.example.jdbclab.infrastructure;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** Composition root: framework wiring belongs to infrastructure. */
@SpringBootApplication(scanBasePackages = "com.example.jdbclab")
public class JdbcLabApplication {
    public static void main(String[] args) {
        SpringApplication.run(JdbcLabApplication.class, args);
    }
}
