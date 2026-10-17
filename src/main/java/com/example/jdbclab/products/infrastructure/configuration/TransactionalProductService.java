package com.example.jdbclab.products.infrastructure.configuration;

import com.example.jdbclab.products.application.ProductRepository;
import com.example.jdbclab.products.application.ProductService;
import com.example.jdbclab.products.domain.OwnedProduct;
import java.math.BigDecimal;
import org.springframework.transaction.annotation.Transactional;

/** Applies the creation transaction without introducing Spring into the application layer. */
public class TransactionalProductService extends ProductService {
    public TransactionalProductService(ProductRepository repository) {
        super(repository);
    }

    @Override
    @Transactional
    public OwnedProduct create(Long ownerUserId, String title, BigDecimal price, String description, long stock) {
        return super.create(ownerUserId, title, price, description, stock);
    }
}
