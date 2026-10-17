package com.example.jdbclab.users.application;

import com.example.jdbclab.users.domain.User;
import java.util.List;

/** Framework-free orchestration of user read operations. */
public class UserService {
    private final UserRepository repository;

    public UserService(UserRepository repository) {
        this.repository = repository;
    }

    public List<User> findAll() {
        return repository.findAll();
    }

    public User findCurrentUser(String authenticatedSubject) {
        final Long id;
        try {
            id = Long.valueOf(authenticatedSubject);
        } catch (NumberFormatException exception) {
            throw new CurrentUserUnavailableException();
        }
        return repository.findById(id).orElseThrow(CurrentUserUnavailableException::new);
    }

    public User findById(Long id) {
        return repository.findById(id).orElseThrow(() -> new UserNotFoundException(id));
    }
}
