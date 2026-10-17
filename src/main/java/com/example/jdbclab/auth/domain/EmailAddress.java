package com.example.jdbclab.auth.domain;

import java.util.Locale;

/** Shared canonical form for authentication email addresses; never rewrites stored rows. */
public final class EmailAddress {
    private EmailAddress() { }

    public static String normalize(String email) {
        return email == null ? null : email.strip().toLowerCase(Locale.ROOT);
    }
}
