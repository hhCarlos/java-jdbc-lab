package com.example.jdbclab.auth.infrastructure.configuration;

import com.example.jdbclab.auth.application.CredentialRepository;
import com.example.jdbclab.auth.application.LoginService;
import com.example.jdbclab.auth.application.PasswordVerifier;
import com.example.jdbclab.auth.application.RegistrationService;
import com.example.jdbclab.auth.application.TokenIssuer;
import com.example.jdbclab.auth.infrastructure.jwt.JwtTokenIssuer;
import com.example.jdbclab.auth.infrastructure.password.BcryptPasswordVerifier;
import com.example.jdbclab.users.application.RegistrationRepository;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Objects;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;

/** Shared signing material and crypto adapters for token issuance and resource-server validation. */
@Configuration(proxyBeanMethods = false)
public class AuthConfiguration {
    @Bean
    PasswordEncoder passwordEncoder() {
        // Direct encoder accepts existing raw $2b$ hashes without a {bcrypt} prefix.
        return new BCryptPasswordEncoder();
    }

    @Bean
    PasswordVerifier passwordVerifier(PasswordEncoder encoder) {
        return new BcryptPasswordVerifier(encoder);
    }

    @Bean
    SecretKey jwtSigningKey(@Value("${auth.jwt.secret:}") String secret) {
        byte[] key;
        try {
            key = Base64.getDecoder().decode(secret);
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("JWT signing secret must be Base64-encoded random bytes.");
        }
        if (key.length < 32) {
            throw new IllegalStateException("JWT signing secret must contain at least 32 decoded random bytes.");
        }
        return new SecretKeySpec(key, "HmacSHA256");
    }

    @Bean
    TokenIssuer tokenIssuer(SecretKey jwtSigningKey, @Value("${auth.jwt.issuer}") String issuer,
                            @Value("${auth.jwt.lifetime-seconds}") long lifetime) {
        var encoder = new NimbusJwtEncoder(new ImmutableSecret<>(jwtSigningKey));
        return new JwtTokenIssuer(encoder, Clock.systemUTC(), issuer, lifetime);
    }

    @Bean
    JwtDecoder jwtDecoder(SecretKey jwtSigningKey, @Value("${auth.jwt.issuer}") String issuer) {
        var decoder = NimbusJwtDecoder.withSecretKey(jwtSigningKey).macAlgorithm(MacAlgorithm.HS256).build();
        // Require expiry, rather than merely validating it when present; no grace after expiration.
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                new JwtTimestampValidator(Duration.ZERO), new JwtIssuerValidator(issuer),
                new JwtClaimValidator<Instant>(JwtClaimNames.EXP, Objects::nonNull),
                new JwtClaimValidator<String>(JwtClaimNames.SUB, subject -> subject != null && !subject.isBlank())));
        return decoder;
    }

    @Bean
    LoginService loginService(CredentialRepository credentials, PasswordVerifier passwords, TokenIssuer tokens) {
        return new LoginService(credentials, passwords, tokens);
    }

    @Bean
    RegistrationService registrationService(RegistrationRepository users, PasswordEncoder encoder) {
        return new RegistrationService(users, encoder::encode);
    }

}
