package com.example.jdbclab.auth.infrastructure.web;

import com.example.jdbclab.auth.domain.EmailAddress;
import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

public record LoginRequest(
        @NotBlank @Email @Size(max = 254)
        @Schema(description = "Email is stripped of surrounding whitespace and lowercased", example = "ana@example.test") String email,
        @NotBlank @Size(max = 72)
        @Schema(description = "Password, at most 72 UTF-8 bytes", accessMode = Schema.AccessMode.WRITE_ONLY,
                format = "password") String password) {
    public LoginRequest {
        email = EmailAddress.normalize(email);
    }

    @AssertTrue(message = "Password must be at most 72 UTF-8 bytes")
    @JsonIgnore
    @Schema(hidden = true)
    public boolean isPasswordWithinBcryptLimit() {
        return PasswordInput.isWithinBcryptLimit(password);
    }

    @Override public String toString() { return "LoginRequest[redacted]"; }
}
