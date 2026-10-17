package com.example.jdbclab.users.application;

import com.example.jdbclab.users.domain.User;
import java.util.List;
import java.util.Optional;

public interface UserRepository {
    List<User> findAll();

    Optional<User> findById(Long id);
}
