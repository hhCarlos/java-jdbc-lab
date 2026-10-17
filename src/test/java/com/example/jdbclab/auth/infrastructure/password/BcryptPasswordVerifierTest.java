package com.example.jdbclab.auth.infrastructure.password;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.assertj.core.api.Assertions.*;

class BcryptPasswordVerifierTest {
    @Test
    void verifiesRaw2bHashWithoutPrefixOrModification() {
        var encoder = new BCryptPasswordEncoder(BCryptPasswordEncoder.BCryptVersion.$2B, 4);
        var verifier = new BcryptPasswordVerifier(encoder);
        String hash = encoder.encode("correct-password");
        assertThat(hash).startsWith("$2b$");
        assertThat(verifier.matches("correct-password", hash)).isTrue();
        assertThat(verifier.matches("wrong-password", hash)).isFalse();
        assertThat(verifier.matches("correct-password", null)).isFalse();
    }
}
