package com.example.jdbclab.auth.application;

public class InvalidCredentialsException extends RuntimeException {
    public InvalidCredentialsException() { super("Invalid email or password."); }
}
