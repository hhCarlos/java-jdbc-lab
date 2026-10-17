package com.example.jdbclab.users.infrastructure.configuration;

import com.example.jdbclab.users.application.UserRepository;
import com.example.jdbclab.users.application.UserService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class UserConfiguration {
    @Bean
    UserService userService(UserRepository repository) {
        return new UserService(repository);
    }
}
