package com.example.jdbclab.products.infrastructure.configuration;

import com.example.jdbclab.products.application.ProductRepository;
import com.example.jdbclab.products.application.ProductService;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProductCreationTransactionTest {
    @Configuration(proxyBeanMethods = false)
    @EnableTransactionManagement
    @Import(ProductConfiguration.class)
    static class TestConfiguration {
        @Bean DriverManagerDataSource dataSource() {
            return new DriverManagerDataSource("jdbc:h2:mem:" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1", "sa", "");
        }
        @Bean JdbcTemplate jdbc(DriverManagerDataSource source) { return new JdbcTemplate(source); }
        @Bean DataSourceTransactionManager transactionManager(DriverManagerDataSource source) {
            return new DataSourceTransactionManager(source);
        }
        @Bean ProductRepository repository() { return mock(ProductRepository.class); }
    }

    @Test
    void softDeletionRunsInTransactionAndUnexpectedRowCountRollsBack() {
        try (var context = new AnnotationConfigApplicationContext(TestConfiguration.class)) {
            var jdbc = context.getBean(JdbcTemplate.class);
            jdbc.execute("CREATE TABLE deletion_effect (id BIGINT PRIMARY KEY)");
            var repository = context.getBean(ProductRepository.class);
            when(repository.softDeleteByIdAndOwnerId(8L, 7L)).thenAnswer(invocation -> {
                assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isTrue();
                jdbc.update("INSERT INTO deletion_effect VALUES (?)", 8);
                return 2;
            });
            assertThatIllegalStateException().isThrownBy(() -> context.getBean(ProductService.class)
                    .softDeleteByIdAndOwnerId(8L, 7L));
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM deletion_effect", Long.class)).isZero();
        }
    }

    @Test
    void creationRunsInsideTransactionAndRollsBackOnFailure() {
        try (var context = new AnnotationConfigApplicationContext(TestConfiguration.class)) {
            var jdbc = context.getBean(JdbcTemplate.class);
            jdbc.execute("CREATE TABLE creation_effect (id BIGINT PRIMARY KEY)");
            var repository = context.getBean(ProductRepository.class);
            when(repository.insert(7L, "Product", BigDecimal.ONE, null, 1, "INACTIVE"))
                    .thenAnswer(invocation -> {
                        assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isTrue();
                        jdbc.update("INSERT INTO creation_effect VALUES (?)", 1);
                        throw new IllegalStateException("Simulated persistence failure");
                    });
            assertThatThrownBy(() -> context.getBean(ProductService.class)
                    .create(7L, "Product", BigDecimal.ONE, null, 1, false))
                    .isInstanceOf(IllegalStateException.class);
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM creation_effect", Long.class)).isZero();
        }
    }
    @Test
    void updateLookupWriteAndReadbackShareTransactionAndReadbackFailureRollsBack() {
        try (var context = new AnnotationConfigApplicationContext(TestConfiguration.class)) {
            var jdbc = context.getBean(JdbcTemplate.class);
            jdbc.execute("CREATE TABLE update_effect (id BIGINT PRIMARY KEY)");
            var repository = context.getBean(ProductRepository.class);
            var current = new com.example.jdbclab.products.domain.OwnedProduct(
                    8L, "Old", BigDecimal.ONE, null, 1, "ACTIVE");
            var reads = new java.util.concurrent.atomic.AtomicInteger();
            when(repository.findByIdAndOwnerId(8L, 7L)).thenAnswer(invocation -> {
                assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isTrue();
                if (reads.incrementAndGet() == 2) throw new IllegalStateException("Readback failed");
                return java.util.Optional.of(current);
            });
            when(repository.update(8L, 7L, "New", BigDecimal.ONE, null, 0, "INACTIVE"))
                    .thenAnswer(invocation -> {
                        assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isTrue();
                        jdbc.update("INSERT INTO update_effect VALUES (?)", 8);
                        return 1;
                    });
            assertThatThrownBy(() -> context.getBean(ProductService.class)
                    .update(8L, 7L, "New", BigDecimal.ONE, null, 0, true))
                    .isInstanceOf(IllegalStateException.class).hasMessage("Readback failed");
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM update_effect", Long.class)).isZero();
        }
    }
}
