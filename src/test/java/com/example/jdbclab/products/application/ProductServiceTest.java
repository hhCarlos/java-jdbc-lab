package com.example.jdbclab.products.application;

import java.util.List;
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
}
