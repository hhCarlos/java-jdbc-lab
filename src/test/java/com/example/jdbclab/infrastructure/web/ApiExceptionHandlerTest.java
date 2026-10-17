package com.example.jdbclab.infrastructure.web;

import jakarta.servlet.RequestDispatcher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ApiExceptionHandlerTest {
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new TestController(), new ApiErrorController())
                .setControllerAdvice(new ApiExceptionHandler()).build();
    }

    @Test
    void servletErrorsUseSameProblemFormat() throws Exception {
        mvc.perform(get("/error")
                        .requestAttr(RequestDispatcher.ERROR_STATUS_CODE, 404)
                        .requestAttr(RequestDispatcher.ERROR_REQUEST_URI, "/missing"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.instance").value("/missing"));
    }

    @Test
    void unexpectedFailureIsSanitized() throws Exception {
        mvc.perform(get("/failure"))
                .andExpect(status().isInternalServerError())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.title").value("Internal Server Error"))
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.detail").value("An unexpected error occurred."))
                .andExpect(jsonPath("$.instance").value("/failure"));
    }

    @Test
    void malformedParameterRetainsClientErrorStatus() throws Exception {
        mvc.perform(get("/parameter").param("value", "invalid"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.instance").value("/parameter"));
    }

    @Test
    void unsupportedMethodRetainsMethodNotAllowed() throws Exception {
        mvc.perform(post("/failure"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(header().string("Allow", "GET"))
                .andExpect(jsonPath("$.status").value(405));
    }

    @RestController
    static class TestController {
        @GetMapping("/failure")
        String failure() {
            throw new IllegalStateException("sensitive database details");
        }

        @GetMapping("/parameter")
        int parameter(@RequestParam int value) {
            return value;
        }
    }
}
