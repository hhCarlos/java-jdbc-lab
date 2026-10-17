package com.example.jdbclab.infrastructure.configuration;

import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;

@Configuration
public class RuntimeProfileConfiguration {
    @Bean
    static BeanFactoryPostProcessor validateRuntimeProfiles(Environment environment) {
        return beanFactory -> {
            boolean dev = environment.acceptsProfiles(Profiles.of("dev"));
            boolean prod = environment.acceptsProfiles(Profiles.of("prod"));
            if (dev && prod) {
                throw new IllegalStateException("Profiles dev and prod cannot be active together.");
            }
            if (prod) {
                for (String setting : new String[]{"PROD_DB_URL", "PROD_DB_USERNAME", "PROD_DB_PASSWORD"}) {
                    String value = environment.getProperty(setting);
                    if (value == null || value.isBlank()) {
                        throw new IllegalStateException("Production requires " + setting + ".");
                    }
                }
            }
        };
    }
}
