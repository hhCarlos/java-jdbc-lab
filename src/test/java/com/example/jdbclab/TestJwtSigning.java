package com.example.jdbclab;

import java.security.SecureRandom;
import java.util.Base64;

/** Ephemeral test-only keys; no signing material is stored in source control. */
public final class TestJwtSigning {
    private TestJwtSigning() { }

    public static String randomSecret() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }
}
