package com.example.jdbclab.auth.infrastructure.jwt;

import com.example.jdbclab.auth.application.AccessToken;
import com.example.jdbclab.auth.application.TokenIssuer;
import java.time.Clock;
import java.time.temporal.ChronoUnit;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;

public class JwtTokenIssuer implements TokenIssuer {
    private final JwtEncoder encoder;
    private final Clock clock;
    private final String issuer;
    private final long lifetimeSeconds;

    public JwtTokenIssuer(JwtEncoder encoder, Clock clock, String issuer, long lifetimeSeconds) {
        if (issuer == null || issuer.isBlank() || lifetimeSeconds <= 0 || lifetimeSeconds > 86400) {
            throw new IllegalArgumentException("JWT issuer must be nonblank and lifetime must be 1–86400 seconds.");
        }
        this.encoder = encoder;
        this.clock = clock;
        this.issuer = issuer;
        this.lifetimeSeconds = lifetimeSeconds;
    }

    @Override
    public AccessToken issue(Long userId) {
        var now = clock.instant().truncatedTo(ChronoUnit.SECONDS);
        var claims = JwtClaimsSet.builder().subject(userId.toString()).issuer(issuer)
                .issuedAt(now).expiresAt(now.plusSeconds(lifetimeSeconds)).build();
        var header = JwsHeader.with(MacAlgorithm.HS256).type("JWT").build();
        return new AccessToken(encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue(),
                lifetimeSeconds);
    }
}
