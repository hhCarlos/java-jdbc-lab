package com.example.jdbclab.auth.infrastructure.web;

import com.example.jdbclab.auth.domain.EmailAddress;
import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

public record RegisterRequest(
        @NotBlank @Size(max = 50) @Schema(example = "Ana") String name,
        @NotBlank @Size(max = 50) @Schema(example = "Lopez") String lastname,
        @NotBlank @Email @Size(max = 254)
        @Schema(description = "Email is stripped of surrounding whitespace and lowercased", example = "ana@example.test") String email,
        @NotBlank @Size(max = 72)
        @Schema(description = "Password, at most 72 UTF-8 bytes; preserved exactly", format = "password",
                accessMode = Schema.AccessMode.WRITE_ONLY) String password) {
    public RegisterRequest {
        email = EmailAddress.normalize(email);
    }

    @AssertTrue(message = "Password must be at most 72 UTF-8 bytes")
    @JsonIgnore
    @Schema(hidden = true)
    public boolean isPasswordWithinBcryptLimit() {
        return PasswordInput.isWithinBcryptLimit(password);
    }

    @Override public String toString() { return "RegisterRequest[redacted]"; }
}
