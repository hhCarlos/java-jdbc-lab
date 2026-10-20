package com.example.jdbclab.products.application;

import java.util.List;
import java.util.Optional;
import java.math.BigDecimal;
import com.example.jdbclab.products.domain.OwnedProduct;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProductServiceTest {
    private final ProductRepository repository = mock(ProductRepository.class);
    private final ProductService service = new ProductService(repository);

    @Test
    void lookupDelegatesBothIdsAndReturnsActiveInactiveAndZeroStockProducts() {
        for (String status : new String[]{"ACTIVE", "INACTIVE"}) {
            for (long stock : new long[]{0, 5}) {
                var product = new OwnedProduct(8L, "Product", BigDecimal.ONE, "Description", stock, status);
                when(repository.findByIdAndOwnerId(8L, 7L)).thenReturn(Optional.of(product));
                assertThat(service.findByIdAndOwnerId(8L, 7L)).isSameAs(product);
            }
        }
        verify(repository, times(4)).findByIdAndOwnerId(8L, 7L);
    }

    @Test
    void emptyLookupAlwaysUsesTheSameNotFoundException() {
        when(repository.findByIdAndOwnerId(8L, 7L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.findByIdAndOwnerId(8L, 7L))
                .isInstanceOf(ProductNotFoundException.class).hasMessage("Product with id 8 was not found.");
        verify(repository).findByIdAndOwnerId(8L, 7L);
    }

    @Test
    void lookupRejectsInvalidIdsBeforePersistence() {
        for (Long id : new Long[]{null, 0L, -1L}) {
            assertThatIllegalArgumentException().isThrownBy(() -> service.findByIdAndOwnerId(id, 7L));
        }
        assertThatNullPointerException().isThrownBy(() -> service.findByIdAndOwnerId(8L, null));
        verifyNoInteractions(repository);
    }

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

    @Test
    void updateUsesCurrentStatusAndReadsBackAfterExactlyOneAffectedRow() {
        for (String status : new String[]{"ACTIVE", "INACTIVE"}) {
            for (long stock : new long[]{0, 5}) {
                reset(repository);
                String target = status.equals("ACTIVE") && stock > 0 ? "ACTIVE" : "INACTIVE";
                var current = new OwnedProduct(8L, "Old", BigDecimal.ONE, "Old", 1, status);
                var saved = new OwnedProduct(8L, "New", BigDecimal.TEN, null, stock, target);
                when(repository.findByIdAndOwnerId(8L, 7L)).thenReturn(Optional.of(current), Optional.of(saved));
                when(repository.update(8L, 7L, "New", BigDecimal.TEN, null, stock, target)).thenReturn(1);
                assertThat(service.update(8L, 7L, "New", BigDecimal.TEN, null, stock)).isSameAs(saved);
                var order = inOrder(repository);
                order.verify(repository).findByIdAndOwnerId(8L, 7L);
                order.verify(repository).update(8L, 7L, "New", BigDecimal.TEN, null, stock, target);
                order.verify(repository).findByIdAndOwnerId(8L, 7L);
                verifyNoMoreInteractions(repository);
            }
        }
    }

    @Test
    void updateRejectsMissingDeletedAndZeroAffectedRows() {
        assertThatThrownBy(() -> service.update(8L, 7L, "New", BigDecimal.ONE, null, 1))
                .isInstanceOf(ProductNotFoundException.class);
        when(repository.findByIdAndOwnerId(8L, 7L)).thenReturn(Optional.of(
                new OwnedProduct(8L, "Old", BigDecimal.ONE, null, 1, "DELETED")));
        assertThatThrownBy(() -> service.update(8L, 7L, "New", BigDecimal.ONE, null, 1))
                .isInstanceOf(ProductNotFoundException.class);
        verify(repository, never()).update(any(), any(), any(), any(), any(), anyLong(), any());
        when(repository.findByIdAndOwnerId(8L, 7L)).thenReturn(Optional.of(
                new OwnedProduct(8L, "Old", BigDecimal.ONE, null, 1, "ACTIVE")));
        assertThatThrownBy(() -> service.update(8L, 7L, "New", BigDecimal.ONE, null, 1))
                .isInstanceOf(ProductNotFoundException.class);
        verify(repository, times(3)).findByIdAndOwnerId(8L, 7L);
    }

    @Test
    void updateValidatesBeforePersistence() {
        for (BigDecimal price : new BigDecimal[]{null, new BigDecimal("-1"), new BigDecimal("0.001"), new BigDecimal("10000000000")}) {
            assertThatIllegalArgumentException().isThrownBy(() -> service.update(8L, 7L, "New", price, null, 1));
        }
        for (String title : new String[]{null, " ", "x".repeat(51)}) {
            assertThatIllegalArgumentException().isThrownBy(() -> service.update(8L, 7L, title, BigDecimal.ONE, null, 1));
        }
        for (long stock : new long[]{-1, 10000000000L}) {
            assertThatIllegalArgumentException().isThrownBy(() -> service.update(8L, 7L, "New", BigDecimal.ONE, null, stock));
        }
        for (Long id : new Long[]{null, 0L, -1L}) {
            assertThatIllegalArgumentException().isThrownBy(() -> service.update(id, 7L, "New", BigDecimal.ONE, null, 1));
        }
        assertThatNullPointerException().isThrownBy(() -> service.update(8L, null, "New", BigDecimal.ONE, null, 1));
        verifyNoInteractions(repository);
    }
}
