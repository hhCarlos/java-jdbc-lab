package com.example.jdbclab.auth.infrastructure.web;

import com.example.jdbclab.infrastructure.web.ApiExceptionHandler;

import com.example.jdbclab.auth.application.AccessToken;
import com.example.jdbclab.auth.application.InvalidCredentialsException;
import com.example.jdbclab.auth.application.LoginService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Exercises the login HTTP contract and validates sensitive input before the use case. */
@ExtendWith(OutputCaptureExtension.class)
class LoginHttpContractTest {
    private final LoginService login = mock(LoginService.class);
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        var validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mvc = MockMvcBuilders.standaloneSetup(new AuthController(login))
                .setControllerAdvice(new ApiExceptionHandler()).setValidator(validator).build();
    }

    @Test
    void validRequestReturnsOnlyTheTokenContractWithoutAuthenticationHeaders() throws Exception {
        when(login.login("ana@example.test", "private-password"))
                .thenReturn(new AccessToken("test-token", 600));
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ana@example.test\",\"password\":\"private-password\"}"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.accessToken").value("test-token"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(600))
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(content().string(not(containsString("private-password"))));
    }

    @Test
    void failedLoginUsesTheSame401ProblemForEitherCredentialFailure() throws Exception {
        when(login.login(anyString(), anyString())).thenThrow(new InvalidCredentialsException());
        String previous = null;
        for (String email : new String[]{"ana@example.test", "missing@example.test"}) {
            String body = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"email\":\"" + email + "\",\"password\":\"private-password\"}"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                    .andExpect(jsonPath("$.detail").value("Invalid email or password."))
                    .andExpect(jsonPath("$.accessToken").doesNotExist())
                    .andExpect(content().string(not(containsString("private-password"))))
                    .andReturn().getResponse().getContentAsString();
            if (previous != null) org.assertj.core.api.Assertions.assertThat(body).isEqualTo(previous);
            previous = body;
        }
    }

    @Test
    void unexpectedLoginFailureDoesNotLogCredentialBearingExceptionDetails(CapturedOutput output) throws Exception {
        when(login.login(anyString(), anyString()))
                .thenThrow(new IllegalStateException("private-password-and-hash-marker"));
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ana@example.test\",\"password\":\"private-password\"}"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.detail").value("An unexpected error occurred."))
                .andExpect(content().string(not(containsString("private-password"))));
        org.assertj.core.api.Assertions.assertThat(output.getAll())
                .doesNotContain("private-password-and-hash-marker");
    }

    @Test
    void missingBlankMalformedAndOversizedInputNeverReachesLogin() throws Exception {
        for (String body : new String[]{"{}", "not-json", "null",
                "{\"email\":\"invalid\",\"password\":\"private-rejected-value\"}",
                "{\"email\":\"ana@example.test\",\"password\":\" \"}",
                "{\"email\":\"ana@example.test\",\"password\":\"" + "a".repeat(73) + "\"}",
                "{\"email\":\"ana@example.test\",\"password\":\"" + "é".repeat(37) + "\"}"}) {
            mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.detail").value("Invalid request input."))
                    .andExpect(content().string(not(containsString("private-rejected-value"))));
        }
        verifyNoInteractions(login);
    }

    @Test
    void malformedJsonNeverEchoesThePasswordValue() throws Exception {
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ana@example.test\",\"password\":\"private-rejected-value\""))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(not(containsString("private-rejected-value"))));
        verifyNoInteractions(login);
    }
}
