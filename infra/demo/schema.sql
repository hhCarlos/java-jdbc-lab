SET ECHO OFF
SET VERIFY OFF
SET DEFINE OFF
WHENEVER OSERROR EXIT FAILURE
WHENEVER SQLERROR EXIT FAILURE ROLLBACK
BEGIN
    IF USER <> 'STORE_JDBC' OR SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA') <> 'STORE_JDBC'
        OR SYS_CONTEXT('USERENV', 'CON_NAME') <> 'FREEPDB1' THEN
        RAISE_APPLICATION_ERROR(-20001, 'Expected STORE_JDBC schema in FREEPDB1');
    END IF;
END;
/
@/opt/demo/tables/users.sql
@/opt/demo/tables/product_statuses.sql
@/opt/demo/tables/products.sql
@/opt/demo/tables/product_statuses_seed.sql
COMMIT;
DECLARE
    users_count NUMBER;
    products_count NUMBER;
    statuses_count NUMBER;
    canonical_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO users_count FROM users;
    SELECT COUNT(*) INTO products_count FROM products;
    SELECT COUNT(*) INTO statuses_count FROM product_statuses;
    SELECT COUNT(*) INTO canonical_count FROM product_statuses
    WHERE (id = 1 AND code = 'ACTIVE' AND name = 'Activo')
       OR (id = 2 AND code = 'INACTIVE' AND name = 'Inactivo')
       OR (id = 3 AND code = 'DELETED' AND name = 'Eliminado');
    IF users_count <> 0 OR products_count <> 0 OR statuses_count <> 3 OR canonical_count <> 3 THEN
        RAISE_APPLICATION_ERROR(-20002, 'Demo initialization contract failed');
    END IF;
END;
/
EXIT SUCCESS
