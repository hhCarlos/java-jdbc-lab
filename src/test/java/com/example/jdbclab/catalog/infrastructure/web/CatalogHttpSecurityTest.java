package com.example.jdbclab.catalog.infrastructure.web;

import com.example.jdbclab.TestJwtSigning;
import com.example.jdbclab.catalog.application.CatalogService;
import com.example.jdbclab.catalog.application.ProductNotFoundException;
import com.example.jdbclab.catalog.domain.CatalogProduct;
import com.example.jdbclab.infrastructure.JdbcLabApplication;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import java.math.BigDecimal;
import java.util.List;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = JdbcLabApplication.class, properties = {
        "spring.profiles.active=", "app.dev-db-reset=false", "springdoc.api-docs.enabled=true"})
@Import(CatalogHttpSecurityTest.Isolation.class)
class CatalogHttpSecurityTest {
    private static final String KEY = TestJwtSigning.randomSecret();
    @DynamicPropertySource
    static void signing(DynamicPropertyRegistry properties) {
        properties.add("auth.jwt.secret", () -> KEY);
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class Isolation {
        @Bean DataSource dataSource() { return mock(DataSource.class); }
        @Bean OpenAPI globalSecurity() {
            return new OpenAPI().addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
        }
    }

    @Autowired WebApplicationContext context;
    @MockitoBean CatalogService service;
    private MockMvc mvc;
    private final CatalogProduct product = new CatalogProduct(7L, "Book", new BigDecimal("12.30"), "Description", 4);

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context)
                .addFilters(context.getBean("springSecurityFilterChain", jakarta.servlet.Filter.class)).build();
    }

    @Test
    void anonymousListingUsesDefaultsAndOnlyPublicFields() throws Exception {
        when(service.findAll(0, 20)).thenReturn(List.of(product));
        mvc.perform(get("/catalog/products")).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].length()").value(5))
                .andExpect(jsonPath("$[0].id").value(7))
                .andExpect(jsonPath("$[0].title").value("Book"))
                .andExpect(jsonPath("$[0].price").value(12.30))
                .andExpect(jsonPath("$[0].description").value("Description"))
                .andExpect(jsonPath("$[0].stock").value(4))
                .andExpect(jsonPath("$[0].userId").doesNotExist())
                .andExpect(header().doesNotExist("Set-Cookie"));
        verify(service).findAll(0, 20);
    }

    @Test
    void anonymousListingPassesCustomPaginationAndReturnsEmptyArray() throws Exception {
        when(service.findAll(2, 100)).thenReturn(List.of());
        mvc.perform(get("/catalog/products").param("page", "2").param("pageSize", "100"))
                .andExpect(status().isOk()).andExpect(content().json("[]"));
        verify(service).findAll(2, 100);
    }

    @Test
    void anonymousProductLookupReturnsExistingModel() throws Exception {
        when(service.findById(7L)).thenReturn(product);
        mvc.perform(get("/catalog/products/7")).andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.length()").value(5))
                .andExpect(jsonPath("$.userId").doesNotExist());
        verify(service).findById(7L);
    }

    @Test
    void anonymousMissingProductReturns404Problem() throws Exception {
        when(service.findById(99L)).thenThrow(new ProductNotFoundException(99L));
        mvc.perform(get("/catalog/products/99")).andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.detail").value("Product with id 99 was not found."));
    }

    @Test
    void invalidPaginationAndIdsReturn400BeforeCallingService() throws Exception {
        for (String query : new String[]{"page=-1", "page=no", "page=2147483648", "pageSize=0",
                "pageSize=-1", "pageSize=101", "pageSize=1.5", "pageSize=no"}) {
            mvc.perform(get("/catalog/products?" + query)).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400));
        }
        for (String id : new String[]{"0", "-1", "no", "1.5", "9223372036854775808"}) {
            mvc.perform(get("/catalog/products/" + id)).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400));
        }
        verifyNoInteractions(service);
    }

    @Test
    void existingUserEndpointsStillRequireBearerAuthentication() throws Exception {
        for (String path : new String[]{"/users", "/users/7"}) {
            mvc.perform(get(path)).andExpect(status().isUnauthorized())
                    .andExpect(header().string("WWW-Authenticate", "Bearer"));
        }
    }

    @Test
    void openApiOverridesGlobalBearerRequirementForCatalog() throws Exception {
        var result = mvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
                .andExpect(jsonPath("$.security[0].bearerAuth").isArray());
        for (String path : new String[]{"/catalog/products", "/catalog/products/{id}"}) {
            result.andExpect(jsonPath("$.paths['" + path + "'].get.security", hasSize(0)))
                    .andExpect(jsonPath("$.paths['" + path + "'].get.responses['200']").exists())
                    .andExpect(jsonPath("$.paths['" + path + "'].get.responses['400']").exists())
                    .andExpect(jsonPath("$.paths['" + path + "'].get.responses['500']").exists());
        }
        result.andExpect(jsonPath("$.paths['/catalog/products/{id}'].get.responses['404']").exists())
                .andExpect(jsonPath("$.components.schemas.CatalogProduct.properties.*", hasSize(5)))
                .andExpect(jsonPath("$.paths['/users'].get.security[0].bearerAuth").isArray());
    }
}
