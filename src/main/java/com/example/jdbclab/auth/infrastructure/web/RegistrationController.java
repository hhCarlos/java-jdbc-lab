package com.example.jdbclab.auth.infrastructure.web;

import com.example.jdbclab.auth.application.RegistrationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/auth")
public class RegistrationController {
    private final RegistrationService registration;

    public RegistrationController(RegistrationService registration) {
        this.registration = registration;
    }

    @Operation(summary = "Register a user", description = "Creates an account without logging in or issuing a token. No authentication required.")
    @ApiResponse(responseCode = "201", description = "User created",
            headers = @Header(name = "Location", description = "URL of /users/{id}", schema = @Schema(type = "string", format = "uri")),
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = RegistrationResponse.class)))
    @ApiResponse(responseCode = "400", description = "Invalid JSON or invalid registration input",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Email is already registered",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "500", description = "Unexpected failure; details are sanitized",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @PostMapping("/register")
    public ResponseEntity<RegistrationResponse> register(@Valid @RequestBody RegisterRequest request) {
        var user = registration.register(request.name(), request.lastname(), request.email(), request.password());
        var location = ServletUriComponentsBuilder.fromCurrentContextPath().path("/users/{id}").buildAndExpand(user.id()).toUri();
        return ResponseEntity.created(location).body(RegistrationResponse.from(user));
    }
}
