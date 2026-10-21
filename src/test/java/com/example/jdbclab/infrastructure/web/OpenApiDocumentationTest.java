package com.example.jdbclab.infrastructure.web;

import com.example.jdbclab.TestJwtSigning;
import com.example.jdbclab.infrastructure.JdbcLabApplication;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = JdbcLabApplication.class, properties = {
        "spring.profiles.active=dev", "DEV_DB_RESET=false", "DB_PASSWORD=unused-test-value"})
@Import(OpenApiDocumentationTest.DatabaseIsolation.class)
class OpenApiDocumentationTest {
    @DynamicPropertySource
    static void signingKey(DynamicPropertyRegistry properties) {
        properties.add("auth.jwt.secret", () -> TEST_KEY);
    }

    private static final String TEST_KEY = TestJwtSigning.randomSecret();
    @Autowired WebApplicationContext context;
    @Autowired DataSource dataSource;
    private MockMvc mvc;

    @TestConfiguration(proxyBeanMethods = false)
    static class DatabaseIsolation {
        @Bean DataSource dataSource() { return mock(DataSource.class); }
    }

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context)
                .addFilters(context.getBean("springSecurityFilterChain", jakarta.servlet.Filter.class)).build();
    }

    @Test
    void specificationDescribesBothReadEndpointsWithoutCredentials() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths.*", hasSize(9)))
                .andExpect(jsonPath("$.paths['/users/me/products/{id}'].put.security[0].bearerAuth").isArray())
                .andExpect(jsonPath("$.paths['/users/me/products/{id}'].put.responses['200'].content['application/json'].schema['$ref']").value("#/components/schemas/OwnedProduct"))
                .andExpect(jsonPath("$.paths['/users/me/products/{id}'].put.responses['400']").exists())
                .andExpect(jsonPath("$.paths['/users/me/products/{id}'].put.responses['401']").exists())
                .andExpect(jsonPath("$.paths['/users/me/products/{id}'].put.responses['404']").exists())
                .andExpect(jsonPath("$.paths['/users/me/products/{id}'].put.responses['500']").exists())
                .andExpect(jsonPath("$.paths['/users/me/products/{id}'].put.description", containsString("Omitted or null description clears it")))
                .andExpect(jsonPath("$.components.schemas.UpdateProductRequest.properties.*", hasSize(5)))
                .andExpect(jsonPath("$.components.schemas.UpdateProductRequest.properties.active.description", containsString("Zero stock always forces INACTIVE")))
                .andExpect(jsonPath("$.components.schemas.UpdateProductRequest.required", not(hasItem("active"))))
                .andExpect(jsonPath("$.paths['/catalog/products'].get.security", hasSize(0)))
                .andExpect(jsonPath("$.paths['/catalog/products/{id}'].get.security", hasSize(0)))
                .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.type").value("http"))
                .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.scheme").value("bearer"))
                .andExpect(jsonPath("$.paths['/users/me/products'].post.security[0].bearerAuth").isArray())
                .andExpect(jsonPath("$.paths['/users/me/products'].post.responses['201'].content['application/json'].schema['$ref']").value("#/components/schemas/OwnedProduct"))
                .andExpect(jsonPath("$.paths['/users/me/products'].post.responses['400']").exists())
                .andExpect(jsonPath("$.paths['/users/me/products'].post.responses['401']").exists())
                .andExpect(jsonPath("$.components.schemas.CreateProductRequest.properties.*", hasSize(4)))
                .andExpect(jsonPath("$.paths['/users/me/products'].get.security[0].bearerAuth").isArray())
                .andExpect(jsonPath("$.paths['/users/me/products'].get.parameters", hasSize(2)))
                .andExpect(jsonPath("$.paths['/users/me/products'].get.parameters[0].name").value("page"))
                .andExpect(jsonPath("$.paths['/users/me/products'].get.parameters[1].name").value("pageSize"))
                .andExpect(jsonPath("$.paths['/users/me/products'].get.responses['400']").exists())
                .andExpect(jsonPath("$.paths['/users/me/products'].get.responses['401']").exists())
                .andExpect(jsonPath("$.paths['/users/me/products'].get.responses['200'].content['application/json'].schema.items['$ref']").value("#/components/schemas/OwnedProduct"))
                .andExpect(jsonPath("$.paths['/users/me'].get.security[0].bearerAuth").isArray())
                .andExpect(jsonPath("$.paths['/users/me'].get.responses['401']").exists())
                .andExpect(jsonPath("$.paths['/users/me'].get.parameters").doesNotExist())
                .andExpect(jsonPath("$.paths['/users/me'].get.responses['200'].content['application/json'].schema['$ref']").value("#/components/schemas/UserResponse"))
                .andExpect(jsonPath("$.paths['/users'].get.security[0].bearerAuth").isArray())
                .andExpect(jsonPath("$.paths['/users/{id}'].get.security[0].bearerAuth").isArray())
                .andExpect(jsonPath("$.paths['/users'].get.responses['401']").exists())
                .andExpect(jsonPath("$.paths['/users/{id}'].get.responses['401']").exists())
                .andExpect(jsonPath("$.paths['/auth/login'].post.security").doesNotExist())
                .andExpect(jsonPath("$.paths['/auth/register'].post.security").doesNotExist())
                .andExpect(jsonPath("$.paths['/users'].get.responses['200'].content['application/json'].schema.type").value("array"))
                .andExpect(jsonPath("$.paths['/users'].get.responses['500'].content['application/problem+json']").exists())
                .andExpect(jsonPath("$.paths['/users/{id}'].get.parameters[0].name").value("id"))
                .andExpect(jsonPath("$.paths['/users/{id}'].get.parameters[0].in").value("path"))
                .andExpect(jsonPath("$.paths['/users/{id}'].get.parameters[0].required").value(true))
                .andExpect(jsonPath("$.paths['/users/{id}'].get.parameters[0].schema.format").value("int64"))
                .andExpect(jsonPath("$.paths['/users/{id}'].get.responses['200'].content['application/json'].schema['$ref']").value("#/components/schemas/UserResponse"))
                .andExpect(jsonPath("$.paths['/users/{id}'].get.responses['400'].content['application/problem+json']").exists())
                .andExpect(jsonPath("$.paths['/users/{id}'].get.responses['404'].content['application/problem+json']").exists())
                .andExpect(jsonPath("$.paths['/users/{id}'].get.responses['500'].content['application/problem+json']").exists())
                .andExpect(jsonPath("$.components.schemas.UserResponse.properties.*", hasSize(6)))
                .andExpect(jsonPath("$.components.schemas.UserResponse.properties.createdAt.format").value("date-time"))
                .andExpect(jsonPath("$.components.schemas.UserResponse.properties.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.paths['/auth/login'].post.requestBody.content['application/json'].schema['$ref']").value("#/components/schemas/LoginRequest"))
                .andExpect(jsonPath("$.paths['/auth/login'].post.responses['200'].content['application/json'].schema['$ref']").value("#/components/schemas/LoginResponse"))
                .andExpect(jsonPath("$.paths['/auth/login'].post.responses['400']").exists())
                .andExpect(jsonPath("$.paths['/auth/login'].post.responses['401']").exists())
                .andExpect(jsonPath("$.components.schemas.LoginRequest.properties.password.writeOnly").value(true))
                .andExpect(jsonPath("$.paths['/auth/register'].post.responses['201'].content['application/json'].schema['$ref']").value("#/components/schemas/UserResponse"))
                .andExpect(jsonPath("$.paths['/auth/register'].post.responses['201'].headers.Location").exists())
                .andExpect(jsonPath("$.paths['/auth/register'].post.responses['400']").exists())
                .andExpect(jsonPath("$.paths['/auth/register'].post.responses['409']").exists())
                .andExpect(jsonPath("$.components.schemas.RegisterRequest.properties.password.writeOnly").value(true))
                .andExpect(jsonPath("$.components.schemas.LoginResponse.properties.*", hasSize(3)))
                .andExpect(content().string(not(containsString("passwordHash"))))
                .andExpect(content().string(not(containsString("password_hash"))));
        verifyNoInteractions(dataSource);
    }

    @Test
    void swaggerUiServesAssetsAndPointsToTheSpecification() throws Exception {
        mvc.perform(get("/swagger-ui.html"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/swagger-ui/index.html"));
        mvc.perform(get("/swagger-ui/index.html"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("swagger-ui-bundle.js")));
        mvc.perform(get("/swagger-ui/swagger-ui-bundle.js")).andExpect(status().isOk());
        mvc.perform(get("/swagger-ui/swagger-initializer.js"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("/v3/api-docs/swagger-config")));
        mvc.perform(get("/v3/api-docs/swagger-config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value("/v3/api-docs"));
        verifyNoInteractions(dataSource);
    }
}
