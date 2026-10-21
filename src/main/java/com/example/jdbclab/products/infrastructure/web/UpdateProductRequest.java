package com.example.jdbclab.products.infrastructure.web;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;

/** Only client-editable product fields. Decimal stock prevents JSON fraction truncation. */
public record UpdateProductRequest(
        @NotBlank @Size(max = 50) @Schema(example = "Notebook") String title,
        @NotNull @DecimalMin("0") @Digits(integer = 10, fraction = 2)
        @Schema(description = "Non-negative price, at most 10 integer and 2 fractional digits", example = "49.90") BigDecimal price,
        @Schema(description = "Omitted or null clears the existing description") String description,
        @NotNull @DecimalMin("0") @Digits(integer = 10, fraction = 0)
        @Schema(type = "integer", format = "int64", minimum = "0", maximum = "9999999999", example = "5") BigDecimal stock,
        @Schema(description = "Optional publication choice: with positive stock, true publishes and false suspends. Omitted or null preserves the current status. Zero stock always forces INACTIVE.",
                nullable = true, requiredMode = Schema.RequiredMode.NOT_REQUIRED, example = "true") Boolean active) {
}
