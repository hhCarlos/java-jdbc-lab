package com.example.jdbclab.auth.infrastructure.web;

import com.example.jdbclab.auth.application.LoginService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final LoginService login;

    public AuthController(LoginService login) { this.login = login; }

    @Operation(summary = "Log in", description = "Verifies an existing account and issues a signed JWT. No authentication required.")
    @ApiResponse(responseCode = "200", description = "Authenticated",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = LoginResponse.class)))
    @ApiResponse(responseCode = "400", description = "Invalid JSON or invalid email/password input",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "401", description = "Invalid email or password (same response for either)",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "500", description = "Unexpected failure; details are sanitized",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header(HttpHeaders.PRAGMA, "no-cache")
                .body(LoginResponse.from(login.login(request.email(), request.password())));
    }
}
