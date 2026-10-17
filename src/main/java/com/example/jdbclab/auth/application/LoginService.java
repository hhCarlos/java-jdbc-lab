package com.example.jdbclab.auth.application;

import com.example.jdbclab.auth.domain.EmailAddress;

/** Framework-free login orchestration. */
public class LoginService {
    private final CredentialRepository credentials;
    private final PasswordVerifier passwords;
    private final TokenIssuer tokens;

    public LoginService(CredentialRepository credentials, PasswordVerifier passwords, TokenIssuer tokens) {
        this.credentials = credentials;
        this.passwords = passwords;
        this.tokens = tokens;
    }

    public AccessToken login(String email, String password) {
        var user = credentials.findByEmail(EmailAddress.normalize(email));
        boolean matches = passwords.matches(password, user.map(UserCredentials::passwordHash).orElse(null));
        if (user.isEmpty() || !matches) {
            throw new InvalidCredentialsException();
        }
        return tokens.issue(user.orElseThrow().id());
    }
}
