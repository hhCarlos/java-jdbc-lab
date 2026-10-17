package com.example.jdbclab.auth.infrastructure.configuration;

import com.example.jdbclab.auth.application.CredentialRepository;
import com.example.jdbclab.auth.application.TokenIssuer;
import com.example.jdbclab.users.application.RegistrationRepository;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthConfigurationTest {
    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withInitializer(context -> context.getEnvironment().getPropertySources()
                    .remove(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME))
            .withInitializer(new ConfigDataApplicationContextInitializer())
            .withUserConfiguration(AuthConfiguration.class)
            .withBean(CredentialRepository.class, () -> mock(CredentialRepository.class))
            .withBean(RegistrationRepository.class, () -> mock(RegistrationRepository.class));

    private String key() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }

    @Test
    void missingMalformedAndShortSigningSecretsFailClosed() {
        for (String secret : new String[]{"", "invalid-base64!", "c2hvcnQ="}) {
            runner.withPropertyValues("spring.profiles.active=", "JWT_SECRET=" + secret)
                    .run(context -> assertThat(context).hasFailed());
        }
    }

    @Test
    void prodDoesNotFallBackToDevelopmentSigningSecret() {
        runner.withPropertyValues("spring.profiles.active=prod", "JWT_SECRET=" + key(),
                        "JWT_ISSUER=development", "PROD_JWT_SECRET=", "PROD_JWT_ISSUER=production")
                .run(context -> assertThat(context).hasFailed());
    }

    @Test
    void prodUsesItsOwnSecretIssuerAndLifetime() {
        runner.withPropertyValues("spring.profiles.active=prod", "JWT_SECRET=invalid-development-secret!",
                        "PROD_JWT_SECRET=" + key(), "PROD_JWT_ISSUER=production", "PROD_JWT_TTL_SECONDS=300")
                .run(context -> {
                    assertThat(context).hasNotFailed().hasSingleBean(TokenIssuer.class);
                    assertThat(context.getBean(TokenIssuer.class).issue(42L).expiresIn()).isEqualTo(300);
                });
    }

    @Test
    void configuredDecoderValidatesIssuedTokensAndRejectsTampering() {
        runner.withPropertyValues("spring.profiles.active=", "JWT_SECRET=" + key(), "JWT_ISSUER=decoder-test")
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    var decoder = context.getBean(JwtDecoder.class);
                    String token = context.getBean(TokenIssuer.class).issue(42L).value();
                    assertThat(decoder.decode(token).getSubject()).isEqualTo("42");
                    int signature = token.lastIndexOf('.') + 1;
                    String tampered = token.substring(0, signature) + (token.charAt(signature) == 'A' ? 'B' : 'A')
                            + token.substring(signature + 1);
                    assertThatThrownBy(() -> decoder.decode(tampered)).isInstanceOf(JwtException.class);
                });
    }

    @Test
    void configuredDecoderRequiresIssuerExpirySubjectAndThePinnedAlgorithm() {
        byte[] bytes = new byte[64];
        new SecureRandom().nextBytes(bytes);
        runner.withPropertyValues("spring.profiles.active=", "JWT_SECRET=" + Base64.getEncoder().encodeToString(bytes),
                        "JWT_ISSUER=decoder-test")
                .run(context -> {
                    var decoder = context.getBean(JwtDecoder.class);
                    var encoder = new NimbusJwtEncoder(new ImmutableSecret<>(new SecretKeySpec(bytes, "HmacSHA256")));
                    var now = Instant.now();
                    for (JwtClaimsSet claims : new JwtClaimsSet[]{
                            JwtClaimsSet.builder().subject("42").issuer("decoder-test").issuedAt(now.minusSeconds(600))
                                    .expiresAt(now.minusSeconds(1)).build(),
                            JwtClaimsSet.builder().subject("42").issuer("wrong-issuer").issuedAt(now)
                                    .expiresAt(now.plusSeconds(600)).build(),
                            JwtClaimsSet.builder().subject("42").issuer("decoder-test").issuedAt(now).build(),
                            JwtClaimsSet.builder().issuer("decoder-test").issuedAt(now).expiresAt(now.plusSeconds(600)).build(),
                            JwtClaimsSet.builder().subject("42").issuer("decoder-test").issuedAt(now)
                                    .notBefore(now.plusSeconds(60)).expiresAt(now.plusSeconds(600)).build()}) {
                        String token = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                                .getTokenValue();
                        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(JwtException.class);
                    }
                    String otherAlgorithm = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS512).build(),
                            JwtClaimsSet.builder().subject("42").issuer("decoder-test").issuedAt(now)
                                    .expiresAt(now.plusSeconds(600)).build())).getTokenValue();
                    assertThatThrownBy(() -> decoder.decode(otherAlgorithm)).isInstanceOf(JwtException.class);
                });
    }

}
