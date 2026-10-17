package com.example.jdbclab.auth.infrastructure.web;

import com.example.jdbclab.TestJwtSigning;
import com.example.jdbclab.auth.application.TokenIssuer;
import com.example.jdbclab.infrastructure.JdbcLabApplication;
import com.example.jdbclab.users.application.EmailAlreadyExistsException;
import com.example.jdbclab.users.application.RegistrationRepository;
import com.jayway.jsonpath.JsonPath;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.*;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = JdbcLabApplication.class, properties = {
        "spring.profiles.active=", "app.dev-db-reset=false",
        "spring.datasource.url=jdbc:h2:mem:registration;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver"})
@ExtendWith(OutputCaptureExtension.class)
class RegistrationControllerTest {
    private static final String KEY = TestJwtSigning.randomSecret();
    private static final String PASSWORD = "  preserve-this-password  ";
    @DynamicPropertySource
    static void key(DynamicPropertyRegistry registry) { registry.add("auth.jwt.secret", () -> KEY); }

    @Autowired WebApplicationContext context;
    @Autowired JdbcTemplate jdbc;
    @Autowired RegistrationRepository repository;
    @Autowired PasswordEncoder encoder;
    @Autowired com.example.jdbclab.auth.application.TokenIssuer tokens;
    private MockMvc mvc;
    private final JsonMapper json = JsonMapper.builder().build();

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context)
                .addFilters(context.getBean("springSecurityFilterChain", jakarta.servlet.Filter.class)).build();
        // Isolated H2 only: mirrors the canonical Oracle identity, defaults and named constraints.
        jdbc.execute("DROP TABLE IF EXISTS users");
        jdbc.execute("""
                CREATE TABLE users (
                    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    name VARCHAR(50) NOT NULL, lastname VARCHAR(50) NOT NULL,
                    email VARCHAR(254) NOT NULL, password_hash VARCHAR(512) NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    CONSTRAINT users_email_uk UNIQUE (email))
                """);
    }

    private String request(String name, String lastname, String email, String password) {
        return json.writeValueAsString(Map.of("name", name, "lastname", lastname, "email", email, "password", password));
    }

    @Test
    void registersWithGeneratedIdPublicDtoAndLocationAndCanThenLogIn(CapturedOutput output) throws Exception {
        var result = mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(request("Ana", "Lopez", " ANA@Example.Test ", PASSWORD)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("ana@example.test"))
                .andExpect(jsonPath("$.name").value("Ana"))
                .andExpect(jsonPath("$.lastname").value("Lopez"))
                .andExpect(jsonPath("$.createdAt").isString())
                .andExpect(jsonPath("$.updatedAt").isString())
                .andExpect(jsonPath("$.length()").value(6))
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andExpect(content().string(not(containsString("password"))))
                .andReturn();
        Number id = JsonPath.read(result.getResponse().getContentAsString(), "$.id");
        assertThat(result.getResponse().getHeader("Location")).isEqualTo("http://localhost/users/" + id);
        String hash = jdbc.queryForObject("SELECT password_hash FROM users WHERE id = ?", String.class, id);
        assertThat(hash).isNotEqualTo(PASSWORD).doesNotStartWith("{bcrypt}");
        assertThat(encoder.matches(PASSWORD, hash)).isTrue();
        assertThat(encoder.matches(PASSWORD.strip(), hash)).isFalse();
        mvc.perform(get("/users/" + id).header("Authorization", "Bearer " + tokens.issue(id.longValue()).value()))
                .andExpect(status().isOk())
                .andExpect(content().json(result.getResponse().getContentAsString(),
                        org.springframework.test.json.JsonCompareMode.STRICT));
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", " ANA@EXAMPLE.TEST ", "password", PASSWORD))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.tokenType").value("Bearer"));
        assertThat(output.getAll()).doesNotContain(PASSWORD, hash);
        assertThat(context.containsBean("springSecurityFilterChain")).isTrue();
    }

    @Test
    void duplicateEmailReturns409WithoutChangingTheExistingUser(CapturedOutput output) throws Exception {
        String oldHash = encoder.encode("existing-account-password");
        jdbc.update("INSERT INTO users (name, lastname, email, password_hash) VALUES (?, ?, ?, ?)",
                "Existing", "User", "Ana@Example.Test", oldHash);
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(request("Other", "User", " ANA@EXAMPLE.TEST ", PASSWORD)))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Email is already registered."));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM users", Long.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT password_hash FROM users", String.class)).isEqualTo(oldHash);
        // Legacy mixed-case email still logs in through the same normalization.
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", "ANA@example.test", "password", "existing-account-password"))))
                .andExpect(status().isOk());
        assertThat(output.getAll()).doesNotContain(PASSWORD, oldHash, "existing-account-password");
    }

    @Test
    void databaseUniqueConflictIsTranslatedWhenPrecheckIsBypassed() {
        repository.insert("Ana", "Lopez", "ana@example.test", encoder.encode(PASSWORD));
        // Direct insert deliberately bypasses the use-case existence check, exercising the DB constraint.
        assertThatThrownBy(() -> repository.insert("Other", "User", "ana@example.test", encoder.encode(PASSWORD)))
                .isInstanceOf(EmailAlreadyExistsException.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM users", Long.class)).isEqualTo(1);
    }

    @Test
    void invalidFieldsAndPasswordByteLimitsReturn400WithoutInserting(CapturedOutput output) throws Exception {
        String valid = request("Ana", "Lopez", "ana@example.test", PASSWORD);
        for (String body : new String[]{"{}", "not-json", "null",
                request(" ", "Lopez", "ana@example.test", PASSWORD),
                request("A".repeat(51), "Lopez", "ana@example.test", PASSWORD),
                request("Ana", " ", "ana@example.test", PASSWORD),
                request("Ana", "L".repeat(51), "ana@example.test", PASSWORD),
                request("Ana", "Lopez", "invalid", PASSWORD),
                request("Ana", "Lopez", "a".repeat(245) + "@example.test", PASSWORD),
                request("Ana", "Lopez", "ana@example.test", " "),
                request("Ana", "Lopez", "ana@example.test", "a".repeat(73)),
                request("Ana", "Lopez", "ana@example.test", "é".repeat(37)),
                valid.replace("\"password\":\"" + PASSWORD + "\"", "\"password\":null")}) {
            mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.detail").value("Invalid request input."))
                    .andExpect(content().string(not(containsString(PASSWORD))));
        }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM users", Long.class)).isZero();
        assertThat(output.getAll()).doesNotContain(PASSWORD);
    }

    @Test
    void seventyTwoUtf8BytesAreAcceptedWithoutTruncation() throws Exception {
        String password = "é".repeat(36);
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(request("A".repeat(50), "L".repeat(50), "boundary@example.test", password)))
                .andExpect(status().isCreated());
        assertThat(encoder.matches(password, jdbc.queryForObject("SELECT password_hash FROM users", String.class))).isTrue();
    }

    @Test
    void legacyCaseCollisionsDoNotSelectAnArbitraryAccountOrRewriteRows() throws Exception {
        String hash = encoder.encode(PASSWORD);
        for (String email : new String[]{"ana@example.test", "Ana@Example.Test"}) {
            jdbc.update("INSERT INTO users (name, lastname, email, password_hash) VALUES (?, ?, ?, ?)",
                    "Existing", "User", email, hash);
        }
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", "ANA@example.test", "password", PASSWORD))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Invalid email or password."));
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(request("Ana", "Lopez", "ana@example.test", PASSWORD)))
                .andExpect(status().isConflict());
        assertThat(jdbc.queryForList("SELECT email FROM users ORDER BY email", String.class))
                .containsExactlyInAnyOrder("ana@example.test", "Ana@Example.Test");
    }

    @Test
    void contextPathIsIncludedInLocation() throws Exception {
        mvc.perform(post("/jdbc/auth/register").contextPath("/jdbc").contentType(MediaType.APPLICATION_JSON)
                        .content(request("Ana", "Lopez", "ana@example.test", PASSWORD)))
                .andExpect(status().isCreated()).andExpect(header().string("Location", startsWith("http://localhost/jdbc/users/")));
    }
}
