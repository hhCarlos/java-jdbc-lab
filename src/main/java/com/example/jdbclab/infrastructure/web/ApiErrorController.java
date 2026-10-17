package com.example.jdbclab.infrastructure.web;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import org.springframework.boot.webmvc.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Keeps servlet error dispatches consistent with controller exception responses. */
@RestController
public class ApiErrorController implements ErrorController {
    @RequestMapping("${server.error.path:/error}")
    public ProblemDetail error(HttpServletRequest request) {
        Object statusAttribute = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        HttpStatus status = statusAttribute instanceof Integer code ? HttpStatus.resolve(code) : null;
        if (status == null || !status.isError()) {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
        }
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status,
                status.is5xxServerError() ? "An unexpected error occurred." : status.getReasonPhrase());
        Object path = request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI);
        problem.setInstance(URI.create(path instanceof String uri ? uri : request.getRequestURI()));
        return problem;
    }
}
