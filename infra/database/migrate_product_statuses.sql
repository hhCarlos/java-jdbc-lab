-- Run via setup.py --product-statuses. Stop application writes during migration.
-- Oracle DDL commits implicitly; reruns preserve all already assigned statuses.
SET ECHO OFF
SET VERIFY OFF
SET DEFINE OFF
SET SERVEROUTPUT ON
WHENEVER OSERROR EXIT FAILURE
WHENEVER SQLERROR EXIT FAILURE ROLLBACK
DECLARE
    found PLS_INTEGER;
    initial_count NUMBER;
    after_count NUMBER;
    first_run BOOLEAN;
    TYPE product_row IS RECORD (id NUMBER, user_id NUMBER, title VARCHAR2(50 CHAR),
        price NUMBER, description CLOB, stock NUMBER);
    TYPE products_snapshot IS TABLE OF product_row;
    original products_snapshot;
    current_product product_row;
    status_value NUMBER;
    TYPE status_snapshot IS TABLE OF NUMBER INDEX BY PLS_INTEGER;
    previous_status status_snapshot;
BEGIN
    IF USER <> 'STORE_JDBC' OR SYS_CONTEXT('USERENV', 'CON_NAME') <> 'FREEPDB1' THEN
        RAISE_APPLICATION_ERROR(-20001, 'Expected STORE_JDBC in FREEPDB1');
    END IF;
    SELECT id, user_id, title, price, description, stock BULK COLLECT INTO original FROM products ORDER BY id;
    initial_count := original.COUNT;
    -- Copy CLOB contents so preservation checks compare independent values.
    FOR i IN 1 .. original.COUNT LOOP
        IF original(i).description IS NOT NULL THEN
            DECLARE saved CLOB; BEGIN
                DBMS_LOB.CREATETEMPORARY(saved, TRUE);
                IF DBMS_LOB.GETLENGTH(original(i).description) > 0 THEN
                    DBMS_LOB.COPY(saved, original(i).description, DBMS_LOB.GETLENGTH(original(i).description));
                END IF;
                original(i).description := saved;
            END;
        END IF;
    END LOOP;
    SELECT COUNT(*) INTO found FROM USER_TAB_COLUMNS WHERE TABLE_NAME = 'PRODUCTS' AND COLUMN_NAME = 'STATUS_ID';
    first_run := found = 0;
    IF first_run THEN
        EXECUTE IMMEDIATE 'ALTER TABLE products ADD (status_id NUMBER)';
    ELSE
        FOR i IN 1 .. original.COUNT LOOP
            EXECUTE IMMEDIATE 'SELECT status_id FROM products WHERE id = :1'
                INTO previous_status(i) USING original(i).id;
        END LOOP;
    END IF;
    -- NULL also allows recovery if a prior execution stopped after adding the column.
    EXECUTE IMMEDIATE 'UPDATE products SET status_id = CASE WHEN stock > 0 THEN 1 ELSE 2 END WHERE status_id IS NULL';
    COMMIT;
    SELECT COUNT(*) INTO found FROM USER_TAB_COLUMNS
        WHERE TABLE_NAME = 'PRODUCTS' AND COLUMN_NAME = 'STATUS_ID' AND NULLABLE = 'Y';
    IF found = 1 THEN
        EXECUTE IMMEDIATE 'ALTER TABLE products MODIFY (status_id DEFAULT 2 CONSTRAINT products_status_id_nn NOT NULL)';
    ELSE
        EXECUTE IMMEDIATE 'ALTER TABLE products MODIFY (status_id DEFAULT 2)';
    END IF;
    SELECT COUNT(*) INTO found FROM USER_CONSTRAINTS WHERE TABLE_NAME = 'PRODUCTS' AND CONSTRAINT_NAME = 'PRODUCTS_STATUS_FK';
    IF found = 0 THEN
        EXECUTE IMMEDIATE 'ALTER TABLE products ADD CONSTRAINT products_status_fk FOREIGN KEY (status_id) REFERENCES product_statuses (id)';
    END IF;
    SELECT COUNT(*) INTO after_count FROM products;
    IF after_count <> initial_count THEN RAISE_APPLICATION_ERROR(-20010, 'Product count changed'); END IF;
    FOR i IN 1 .. original.COUNT LOOP
        SELECT id, user_id, title, price, description, stock INTO current_product FROM products WHERE id = original(i).id;
        IF current_product.user_id <> original(i).user_id OR current_product.title <> original(i).title
            OR current_product.price <> original(i).price OR current_product.stock <> original(i).stock
            OR (current_product.description IS NULL AND original(i).description IS NOT NULL)
            OR (current_product.description IS NOT NULL AND original(i).description IS NULL)
            OR DBMS_LOB.COMPARE(current_product.description, original(i).description) <> 0 THEN
            RAISE_APPLICATION_ERROR(-20010, 'Existing product data changed');
        END IF;
        EXECUTE IMMEDIATE 'SELECT status_id FROM products WHERE id = :1' INTO status_value USING original(i).id;
        IF first_run THEN
            IF status_value <> CASE WHEN original(i).stock > 0 THEN 1 ELSE 2 END THEN
                RAISE_APPLICATION_ERROR(-20010, 'Incorrect initial status');
            END IF;
        ELSIF previous_status(i) IS NOT NULL AND status_value <> previous_status(i) THEN
            RAISE_APPLICATION_ERROR(-20010, 'Existing publication status changed on rerun');
        END IF;
        IF original(i).description IS NOT NULL THEN DBMS_LOB.FREETEMPORARY(original(i).description); END IF;
    END LOOP;
    DBMS_OUTPUT.PUT_LINE('PASS: preserved ' || initial_count || ' products, ownership, prices, descriptions and stock.');
    IF first_run THEN DBMS_OUTPUT.PUT_LINE('PASS: initial statuses match existing stock.');
    ELSE DBMS_OUTPUT.PUT_LINE('PASS: existing statuses preserved on rerun.'); END IF;
END;
/
SELECT s.code, COUNT(p.id) product_count FROM product_statuses s
LEFT JOIN products p ON p.status_id = s.id GROUP BY s.code ORDER BY s.code;
EXIT SUCCESS
