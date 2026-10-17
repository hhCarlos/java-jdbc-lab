package com.example.jdbclab.users.infrastructure.web;

import com.example.jdbclab.infrastructure.web.ApiExceptionHandler;

import com.example.jdbclab.users.application.UserService;
import com.example.jdbclab.users.infrastructure.persistence.JdbcUserRepository;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Exercises the controller, real service, JDBC adapter, and advice together on H2. */
class UserControllerTest {
    private MockMvc mvc;
    private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(new DriverManagerDataSource(
                "jdbc:h2:mem:" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1", "sa", ""));
        jdbc.execute("""
                CREATE TABLE users (
                    id NUMBER PRIMARY KEY, name VARCHAR2(50), lastname VARCHAR2(50),
                    email VARCHAR2(254), password_hash VARCHAR2(512),
                    created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE)
                """);
        mvc = MockMvcBuilders.standaloneSetup(new UserController(
                new UserService(new JdbcUserRepository(jdbc))))
                .setControllerAdvice(new ApiExceptionHandler()).build();
    }

    private void insert(long id) {
        jdbc.update("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)", id, "Ana", "Lopez",
                "ana" + id + "@example.test", "SECRET_PASSWORD_HASH",
                OffsetDateTime.parse("2026-10-15T10:00:00-06:00"),
                OffsetDateTime.parse("2026-10-15T11:00:00-06:00"));
    }

    @Test
    void emptyCollectionIs200WithEmptyArray() throws Exception {
        mvc.perform(get("/users")).andExpect(status().isOk()).andExpect(content().json("[]"));
    }

    @Test
    void collectionHasOrderedPublicDtosAndNoCredentials() throws Exception {
        insert(8);
        insert(2);
        mvc.perform(get("/users"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(2))
                .andExpect(jsonPath("$[1].id").value(8))
                .andExpect(jsonPath("$[0].length()").value(6))
                .andExpect(jsonPath("$[0].name").value("Ana"))
                .andExpect(jsonPath("$[0].lastname").value("Lopez"))
                .andExpect(jsonPath("$[0].email").value("ana2@example.test"))
                .andExpect(jsonPath("$[0].createdAt").isString())
                .andExpect(jsonPath("$[0].updatedAt").isString())
                .andExpect(content().string(not(containsString("password"))))
                .andExpect(content().string(not(containsString("SECRET_PASSWORD_HASH"))));
    }

    @Test
    void singleUserReturnsOnlyPublicDtoFields() throws Exception {
        insert(7);
        mvc.perform(get("/users/7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(6))
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.name").value("Ana"))
                .andExpect(jsonPath("$.lastname").value("Lopez"))
                .andExpect(jsonPath("$.email").value("ana7@example.test"))
                .andExpect(jsonPath("$.createdAt").isString())
                .andExpect(jsonPath("$.updatedAt").isString())
                .andExpect(content().string(not(containsString("password"))))
                .andExpect(content().string(not(containsString("SECRET_PASSWORD_HASH"))));
    }

    @Test
    void missingUserReturnsConsistent404Problem() throws Exception {
        mvc.perform(get("/users/99"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.title").value("Not Found"))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.detail").value("User with id 99 was not found."))
                .andExpect(jsonPath("$.instance").value("/users/99"));
    }

    @Test
    void malformedIdReturns400() throws Exception {
        mvc.perform(get("/users/not-a-number"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }
}
