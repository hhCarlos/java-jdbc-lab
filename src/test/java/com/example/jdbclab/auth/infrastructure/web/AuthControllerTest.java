package com.example.jdbclab.auth.infrastructure.web;

import com.example.jdbclab.TestJwtSigning;
import com.example.jdbclab.auth.application.TokenIssuer;
import com.example.jdbclab.infrastructure.JdbcLabApplication;
import com.jayway.jsonpath.JsonPath;
import java.util.Base64;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.*;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = JdbcLabApplication.class, properties = {
        "spring.profiles.active=", "app.dev-db-reset=false",
        "auth.jwt.issuer=login-test", "auth.jwt.lifetime-seconds=600",
        "spring.datasource.url=jdbc:h2:mem:login;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver"})
@ExtendWith(OutputCaptureExtension.class)
class AuthControllerTest {
    @DynamicPropertySource
    static void signingKey(DynamicPropertyRegistry properties) {
        properties.add("auth.jwt.secret", () -> TEST_KEY);
    }

    private static final String TEST_KEY = TestJwtSigning.randomSecret();
    private static final String PASSWORD = "test-login-password";
    @Autowired WebApplicationContext context;
    @Autowired JdbcTemplate jdbc;
    @Autowired com.example.jdbclab.auth.application.TokenIssuer tokens;
    private MockMvc mvc;
    private String hash;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context)
                .addFilters(context.getBean("springSecurityFilterChain", jakarta.servlet.Filter.class)).build();
        // Only the explicitly configured isolated H2 database is touched.
        jdbc.execute("DROP TABLE IF EXISTS users");
        jdbc.execute("""
                CREATE TABLE users (id BIGINT PRIMARY KEY, name VARCHAR(50), lastname VARCHAR(50),
                email VARCHAR(254) UNIQUE, password_hash VARCHAR(512),
                created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE)
                """);
        hash = new BCryptPasswordEncoder(BCryptPasswordEncoder.BCryptVersion.$2B, 4).encode(PASSWORD);
        jdbc.update("INSERT INTO users (id, name, lastname, email, password_hash) VALUES (?, ?, ?, ?, ?)",
                42, "Ana", "Lopez", "ana@example.test", hash);
    }

    @Test
    void loginIsPublicAndReturnsASignedTokenWithoutExposingCredentials(CapturedOutput output) throws Exception {
        var result = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ana@example.test\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(600))
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(content().string(not(containsString(PASSWORD))))
                .andExpect(content().string(not(containsString(hash)))).andReturn();
        String token = JsonPath.read(result.getResponse().getContentAsString(), "$.accessToken");
        var decoder = NimbusJwtDecoder.withSecretKey(new SecretKeySpec(Base64.getDecoder().decode(TEST_KEY), "HmacSHA256"))
                .macAlgorithm(MacAlgorithm.HS256).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer("login-test"));
        var claims = decoder.decode(token);
        assertThat(claims.getSubject()).isEqualTo("42");
        assertThat(claims.getClaims()).containsOnlyKeys("sub", "iss", "iat", "exp");
        assertThat(claims.getExpiresAt().getEpochSecond() - claims.getIssuedAt().getEpochSecond()).isEqualTo(600);
        assertThat(jdbc.queryForObject("SELECT password_hash FROM users WHERE id = 42", String.class)).isEqualTo(hash);
        assertThat(output.getAll()).doesNotContain(PASSWORD, hash, token);
        assertThat(context.containsBean("springSecurityFilterChain")).isTrue();
    }

    @Test
    void unknownEmailAndWrongPasswordHaveIdenticalGeneric401Responses(CapturedOutput output) throws Exception {
        String wrong = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ana@example.test\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Invalid email or password."))
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        String unknown = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"unknown@example.test\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
        assertThat(unknown).isEqualTo(wrong);
        assertThat(output.getAll()).doesNotContain("wrong-password", hash);
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"email\":\"bad\",\"password\":\"secret\"}",
            "{\"email\":\"ana@example.test\",\"password\":\"   \"}",
            "{\"email\":null,\"password\":null}", "not-json"})
    void invalidInputsAre400WithoutRejectedValues(String body, CapturedOutput output) throws Exception {
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Invalid request input."))
                .andExpect(content().string(not(containsString("secret"))));
        assertThat(output.getAll()).doesNotContain("rejected value", hash, "password=secret");
    }

    @Test
    void bcryptByteLimitIsValidatedRatherThanSilentlyTruncatingPasswords() throws Exception {
        for (String password : new String[]{"a".repeat(73), "é".repeat(37)}) {
            mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"email\":\"ana@example.test\",\"password\":\"" + password + "\"}"))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void authenticatedUserReadsKeepTheirExistingResponses() throws Exception {
        mvc.perform(get("/users").header("Authorization", "Bearer " + tokens.issue(42L).value())).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(42))
                .andExpect(content().string(not(containsString(hash))));
        mvc.perform(get("/users/42").header("Authorization", "Bearer " + tokens.issue(42L).value())).andExpect(status().isOk());
    }
}
