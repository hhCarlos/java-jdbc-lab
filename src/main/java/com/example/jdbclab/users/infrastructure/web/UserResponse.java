package com.example.jdbclab.users.infrastructure.web;

import com.example.jdbclab.users.domain.User;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

@Schema(description = "Public user fields. Timestamps include their UTC offset.")
public record UserResponse(
        @Schema(description = "User identifier", example = "1") Long id,
        @Schema(description = "Given name", example = "Ana") String name,
        @Schema(description = "Last name", example = "Lopez") String lastname,
        @Schema(description = "Email address", example = "ana@example.test") String email,
        @Schema(description = "Creation timestamp with UTC offset") OffsetDateTime createdAt,
        @Schema(description = "Last update timestamp with UTC offset") OffsetDateTime updatedAt) {
    public static UserResponse from(User user) {
        return new UserResponse(user.id(), user.name(), user.lastname(), user.email(),
                user.createdAt(), user.updatedAt());
    }
}
