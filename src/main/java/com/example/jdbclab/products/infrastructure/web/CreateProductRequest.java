package com.example.jdbclab.products.infrastructure.web;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;

/** Only client-editable product fields. Decimal stock prevents JSON fraction truncation. */
public record CreateProductRequest(
        @NotBlank @Size(max = 50) @Schema(example = "Notebook") String title,
        @NotNull @DecimalMin("0") @Digits(integer = 10, fraction = 2)
        @Schema(description = "Non-negative price, at most 10 integer and 2 fractional digits", example = "49.90") BigDecimal price,
        @Schema(description = "Optional product description") String description,
        @NotNull @DecimalMin("0") @Digits(integer = 10, fraction = 0)
        @Schema(type = "integer", format = "int64", minimum = "0", maximum = "9999999999", example = "5") BigDecimal stock,
        @Schema(description = "Optional publication choice: false creates INACTIVE. True, omitted or null creates ACTIVE with positive stock. Zero stock always creates INACTIVE. Creation as DELETED is never allowed.",
                nullable = true, requiredMode = Schema.RequiredMode.NOT_REQUIRED, example = "true") Boolean active) {
}
