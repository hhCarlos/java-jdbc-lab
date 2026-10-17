package com.example.jdbclab.auth.infrastructure.jwt;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.security.SecureRandom;
import java.time.*;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;

import static org.assertj.core.api.Assertions.*;

class JwtTokenIssuerTest {
    private final SecretKeySpec key;
    private final Clock clock = Clock.fixed(Instant.parse("2026-10-15T12:00:00Z"), ZoneOffset.UTC);

    JwtTokenIssuerTest() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        key = new SecretKeySpec(bytes, "HmacSHA256");
    }

    private JwtTokenIssuer issuer(long lifetime) {
        return new JwtTokenIssuer(new NimbusJwtEncoder(new ImmutableSecret<>(key)), clock, "test-issuer", lifetime);
    }

    private NimbusJwtDecoder decoder(Clock validationClock) {
        var decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        var timestamp = new JwtTimestampValidator(Duration.ZERO);
        timestamp.setClock(validationClock);
        decoder.setJwtValidator(new org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator<>(
                timestamp, new JwtIssuerValidator("test-issuer")));
        return decoder;
    }

    @Test
    void signedTokenContainsOnlyRequiredClaimsAndConfiguredLifetime() {
        var issued = issuer(600).issue(42L);
        var jwt = decoder(clock).decode(issued.value());
        assertThat(issued.expiresIn()).isEqualTo(600);
        assertThat(jwt.getHeaders().get("alg")).isEqualTo("HS256");
        assertThat(jwt.getClaims()).containsOnlyKeys("sub", "iss", "iat", "exp");
        assertThat(jwt.getSubject()).isEqualTo("42");
        assertThat(jwt.getClaimAsString("iss")).isEqualTo("test-issuer");
        assertThat(jwt.getIssuedAt()).isEqualTo(clock.instant());
        assertThat(jwt.getExpiresAt()).isEqualTo(clock.instant().plusSeconds(600));
    }

    @Test
    void expiredTokenIsRejected() {
        var issued = issuer(60).issue(42L);
        assertThatThrownBy(() -> decoder(Clock.offset(clock, Duration.ofSeconds(61))).decode(issued.value()))
                .isInstanceOf(JwtValidationException.class);
    }

    @Test
    void tamperedSignatureIsRejected() {
        String token = issuer(600).issue(42L).value();
        int signature = token.lastIndexOf('.') + 1;
        String tampered = token.substring(0, signature) + (token.charAt(signature) == 'A' ? 'B' : 'A')
                + token.substring(signature + 1);
        assertThatThrownBy(() -> decoder(clock).decode(tampered)).isInstanceOf(JwtException.class);
    }

    @Test
    void wrongSigningKeyIsRejected() {
        byte[] other = new byte[32];
        new SecureRandom().nextBytes(other);
        var decoder = NimbusJwtDecoder.withSecretKey(new SecretKeySpec(other, "HmacSHA256"))
                .macAlgorithm(MacAlgorithm.HS256).build();
        // Isolate signature verification from timestamp validation in this negative test.
        decoder.setJwtValidator(jwt -> org.springframework.security.oauth2.core.OAuth2TokenValidatorResult.success());
        assertThatThrownBy(() -> decoder.decode(issuer(600).issue(42L).value())).isInstanceOf(JwtException.class);
    }

    @Test
    void invalidIssuerAndLifetimesAreRejected() {
        assertThatThrownBy(() -> issuer(0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> issuer(86401)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new JwtTokenIssuer(new NimbusJwtEncoder(new ImmutableSecret<>(key)), clock, " ", 60))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
