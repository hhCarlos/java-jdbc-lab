package com.example.jdbclab.users.application;

public class EmailAlreadyExistsException extends RuntimeException {
    public EmailAlreadyExistsException() { super("Email is already registered."); }
}
