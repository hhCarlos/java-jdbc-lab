package com.example.jdbclab.catalog.application;

import com.example.jdbclab.catalog.domain.CatalogProduct;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class CatalogServiceTest {
    private final CatalogRepository repository = mock(CatalogRepository.class);
    private final CatalogService service = new CatalogService(repository);
    private final CatalogProduct product = new CatalogProduct(7L, "Book", new BigDecimal("12.30"), null, 4);

    @Test
    void listsFirstPageWithDefaultSizeWithoutAnOwner() {
        when(repository.findAll(0L, 20)).thenReturn(List.of(product));
        assertThat(service.findAll()).containsExactly(product);
    }

    @Test
    void calculatesDefaultAndCustomPageOffsetsWithoutIntegerOverflow() {
        service.findAll(2);
        verify(repository).findAll(40L, 20);
        service.findAll(3, 100);
        verify(repository).findAll(300L, 100);
        service.findAll(Integer.MAX_VALUE, 100);
        verify(repository).findAll(214748364700L, 100);
    }

    @Test
    void rejectsInvalidPaginationBeforeQuerying() {
        assertThatThrownBy(() -> service.findAll(-1, 20)).isInstanceOf(IllegalArgumentException.class);
        for (int size : new int[]{-1, 0, 101}) {
            assertThatThrownBy(() -> service.findAll(0, size)).isInstanceOf(IllegalArgumentException.class);
        }
        verifyNoInteractions(repository);
    }

    @Test
    void returnsEmptyCatalog() {
        when(repository.findAll(0L, 20)).thenReturn(List.of());
        assertThat(service.findAll()).isEmpty();
    }

    @Test
    void findsExistingProduct() {
        when(repository.findById(7L)).thenReturn(Optional.of(product));
        assertThat(service.findById(7L)).isEqualTo(product);
    }

    @Test
    void reportsMissingProductUsingApplicationException() {
        when(repository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.findById(99L)).isInstanceOf(ProductNotFoundException.class)
                .hasMessage("Product with id 99 was not found.");
    }
}
