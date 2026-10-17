package com.example.jdbclab.catalog.infrastructure.web;

import com.example.jdbclab.catalog.application.CatalogService;
import com.example.jdbclab.catalog.domain.CatalogProduct;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import java.util.List;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/catalog/products")
@SecurityRequirements
@ApiResponse(responseCode = "400", description = "Invalid pagination or product ID",
        content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
@ApiResponse(responseCode = "500", description = "Unexpected failure; details are sanitized",
        content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
public class CatalogController {
    private final CatalogService service;

    public CatalogController(CatalogService service) {
        this.service = service;
    }

    @Operation(summary = "List public products", description = "Products from all owners ordered by ID. Pages start at zero; returns an array without total counts.")
    @ApiResponse(responseCode = "200", description = "Requested page, or an empty array",
            content = @Content(mediaType = "application/json",
                    array = @ArraySchema(schema = @Schema(implementation = CatalogProduct.class))))
    @GetMapping
    public List<CatalogProduct> findAll(
            @Parameter(description = "Zero-based page", example = "0")
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @Parameter(description = "Products per page (1–100)", example = "20")
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        return service.findAll(page, pageSize);
    }

    @Operation(summary = "Find a public product by ID")
    @ApiResponse(responseCode = "200", description = "Product found",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = CatalogProduct.class)))
    @ApiResponse(responseCode = "404", description = "No product exists with this ID",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @GetMapping("/{id}")
    public CatalogProduct findById(
            @Parameter(description = "Positive product ID", example = "1") @PathVariable @Positive Long id) {
        return service.findById(id);
    }
}
