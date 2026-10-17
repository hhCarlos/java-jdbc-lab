package com.example.jdbclab.products.application;

import java.util.List;
import java.math.BigDecimal;
import com.example.jdbclab.products.domain.OwnedProduct;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProductServiceTest {
    private final ProductRepository repository = mock(ProductRepository.class);
    private final ProductService service = new ProductService(repository);

    @Test
    void delegatesTrustedOwnerAndUsesLongOffsetArithmetic() {
        long offset = (long) Integer.MAX_VALUE * 100;
        when(repository.findByOwnerId(7L, offset, 100)).thenReturn(List.of());
        assertThat(service.findByOwnerId(7L, Integer.MAX_VALUE, 100)).isEmpty();
        verify(repository).findByOwnerId(7L, offset, 100);
    }

    @Test
    void rejectsInvalidPaginationWithoutCallingRepository() {
        assertThatIllegalArgumentException().isThrownBy(() -> service.findByOwnerId(7L, -1, 20));
        assertThatIllegalArgumentException().isThrownBy(() -> service.findByOwnerId(7L, 0, 0));
        assertThatIllegalArgumentException().isThrownBy(() -> service.findByOwnerId(7L, 0, 101));
        verifyNoInteractions(repository);
    }

    @Test
    void creationAssignsStatusFromStockAndReturnsRepositoryResult() {
        for (long stock : new long[]{0, 5, 9999999999L}) {
            String status = stock > 0 ? "ACTIVE" : "INACTIVE";
            var saved = new OwnedProduct(8L, "Product", new BigDecimal("9999999999.99"), null, stock, status);
            when(repository.insert(7L, "Product", saved.price(), null, stock, status)).thenReturn(saved);
            assertThat(service.create(7L, "Product", saved.price(), null, stock)).isSameAs(saved);
            verify(repository).insert(7L, "Product", saved.price(), null, stock, status);
        }
    }

    @Test
    void creationRejectsInvalidValuesBeforePersistence() {
        for (BigDecimal price : new BigDecimal[]{null, new BigDecimal("-1"), new BigDecimal("0.001"),
                new BigDecimal("10000000000")}) {
            assertThatIllegalArgumentException().isThrownBy(() -> service.create(7L, "Product", price, null, 0));
        }
        for (String title : new String[]{null, " ", "x".repeat(51)}) {
            assertThatIllegalArgumentException().isThrownBy(() -> service.create(7L, title, BigDecimal.ONE, null, 0));
        }
        for (long stock : new long[]{-1, 10000000000L}) {
            assertThatIllegalArgumentException().isThrownBy(() -> service.create(7L, "Product", BigDecimal.ONE, null, stock));
        }
        verifyNoInteractions(repository);
    }

}
