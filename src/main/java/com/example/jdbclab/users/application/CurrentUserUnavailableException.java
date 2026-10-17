package com.example.jdbclab.users.application;

/** The authenticated identity cannot be resolved to a current user. */
public class CurrentUserUnavailableException extends RuntimeException {
    public CurrentUserUnavailableException() {
        super("A valid Bearer token is required.");
    }
}
