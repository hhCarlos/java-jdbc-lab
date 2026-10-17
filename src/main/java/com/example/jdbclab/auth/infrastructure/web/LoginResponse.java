package com.example.jdbclab.auth.infrastructure.web;

import com.example.jdbclab.auth.application.AccessToken;
import io.swagger.v3.oas.annotations.media.Schema;

public record LoginResponse(
        @Schema(description = "Signed JWT access token") String accessToken,
        @Schema(allowableValues = "Bearer") String tokenType,
        @Schema(description = "Token lifetime in seconds", example = "900") long expiresIn) {
    static LoginResponse from(AccessToken token) {
        return new LoginResponse(token.value(), "Bearer", token.expiresIn());
    }

    @Override public String toString() { return "LoginResponse[redacted]"; }
}
