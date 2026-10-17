package com.example.jdbclab.auth.infrastructure.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import tools.jackson.databind.json.JsonMapper;

/** Uniform 401 response, including malformed Bearer headers; never echoes token/error details. */
public final class BearerAuthenticationEntryPoint implements AuthenticationEntryPoint {
    private final JsonMapper json;

    public BearerAuthenticationEntryPoint(JsonMapper json) { this.json = json; }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException exception) throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, "A valid Bearer token is required.");
        problem.setInstance(URI.create(request.getRequestURI()));
        json.writeValue(response.getOutputStream(), problem);
    }
}
