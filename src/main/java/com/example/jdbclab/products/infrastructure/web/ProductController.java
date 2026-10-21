package com.example.jdbclab.products.infrastructure.web;

import com.example.jdbclab.products.application.ProductService;
import com.example.jdbclab.products.domain.OwnedProduct;
import com.example.jdbclab.users.application.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import java.util.List;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users/me/products")
@SecurityRequirement(name = "bearerAuth")
public class ProductController {
    private final ProductService products;
    private final UserService users;

    public ProductController(ProductService products, UserService users) {
        this.products = products;
        this.users = users;
    }

    @Operation(summary = "Soft-delete my product", description = "Requires a valid bearer JWT. Owner is resolved from the authenticated account; no client owner or target status is accepted. Changes ACTIVE or INACTIVE to DELETED, preserving the row and all other fields. Deleted products disappear from owner and public listings and lookups. Repeated deletion returns 404; no recovery is provided.")
    @ApiResponse(responseCode = "204", description = "Product soft-deleted; no response body", content = @Content)
    @ApiResponse(responseCode = "400", description = "Invalid product ID",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "401", description = "Bearer token is missing, invalid, expired, or its user no longer exists",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Product is missing, owned by another user, or already deleted; identical response",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "500", description = "Unexpected failure; details are sanitized",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> softDelete(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt principal,
            @Parameter(description = "Positive product ID", example = "1") @PathVariable @Positive Long id) {
        var currentUser = users.findCurrentUser(principal.getSubject());
        products.softDeleteByIdAndOwnerId(id, currentUser.id());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Find my product by ID", description = "Owner is resolved from the bearer token. Includes inactive and zero-stock products; excludes deleted products.")
    @ApiResponse(responseCode = "200", description = "Product found",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = OwnedProduct.class)))
    @ApiResponse(responseCode = "400", description = "Invalid product ID",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "401", description = "Bearer token is missing, invalid, expired, or its user no longer exists",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Product is missing, owned by another user, or deleted",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "500", description = "Unexpected failure; details are sanitized",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @GetMapping("/{id}")
    public OwnedProduct findMineById(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt principal,
            @Parameter(description = "Positive product ID", example = "1") @PathVariable @Positive Long id) {
        var currentUser = users.findCurrentUser(principal.getSubject());
        return products.findByIdAndOwnerId(id, currentUser.id());
    }

    @Operation(summary = "List my products", description = "Current user's non-deleted products, including inactive and zero-stock products, ordered by ID. Pages start at zero; returns an array without total counts.")
    @ApiResponse(responseCode = "200", description = "Requested page, or an empty array",
            content = @Content(mediaType = "application/json",
                    array = @ArraySchema(schema = @Schema(implementation = OwnedProduct.class))))
    @ApiResponse(responseCode = "400", description = "Invalid pagination",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "401", description = "Bearer token is missing, invalid, expired, or its user no longer exists",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "500", description = "Unexpected failure; details are sanitized",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @GetMapping
    public List<OwnedProduct> findMine(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt principal,
            @Parameter(description = "Zero-based page", example = "0")
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @Parameter(description = "Products per page (1–100)", example = "20")
            @RequestParam(defaultValue = "20") @Min(1) @Max(ProductService.MAX_PAGE_SIZE) int pageSize) {
        var currentUser = users.findCurrentUser(principal.getSubject());
        return products.findByOwnerId(currentUser.id(), page, pageSize);
    }

    @Operation(summary = "Create my product", description = "Owner is the authenticated user. Positive stock creates ACTIVE status; zero stock creates INACTIVE status. Ownership and status supplied by clients are ignored.")
    @ApiResponse(responseCode = "201", description = "Product created",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = OwnedProduct.class)))
    @ApiResponse(responseCode = "400", description = "Invalid JSON or product input",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "401", description = "Bearer token is missing, invalid, expired, or its user no longer exists",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "500", description = "Unexpected failure; details are sanitized",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @PostMapping
    public ResponseEntity<OwnedProduct> create(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt principal,
            @Valid @RequestBody CreateProductRequest request) {
        var currentUser = users.findCurrentUser(principal.getSubject());
        return ResponseEntity.status(201).body(products.create(currentUser.id(), request.title(),
                request.price(), request.description(), request.stock().longValueExact()));
    }

    @Operation(summary = "Replace my product fields", description = "Replaces title, price, description and stock. Omitted or null description clears it. Owner is resolved from the bearer token; client ownership and status fields are ignored. ACTIVE becomes INACTIVE at zero stock; INACTIVE remains INACTIVE when restocked. Deleted products cannot be updated.")
    @ApiResponse(responseCode = "200", description = "Product updated",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = OwnedProduct.class)))
    @ApiResponse(responseCode = "400", description = "Invalid product ID, JSON, or product input",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "401", description = "Bearer token is missing, invalid, expired, or its user no longer exists",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Product is missing, owned by another user, or deleted",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "500", description = "Unexpected failure; details are sanitized",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @PutMapping("/{id}")
    public OwnedProduct update(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt principal,
            @Parameter(description = "Positive product ID", example = "1") @PathVariable @Positive Long id,
            @Valid @RequestBody UpdateProductRequest request) {
        var currentUser = users.findCurrentUser(principal.getSubject());
        return products.update(id, currentUser.id(), request.title(), request.price(),
                request.description(), request.stock().longValueExact());
    }

}
