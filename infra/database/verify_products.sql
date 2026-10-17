-- Probe DML is rolled back; Oracle identity sequence values can still be consumed.
SET ECHO OFF
SET VERIFY OFF
SET DEFINE OFF
SET SERVEROUTPUT ON
WHENEVER OSERROR EXIT FAILURE
WHENEVER SQLERROR EXIT FAILURE ROLLBACK
SELECT COLUMN_NAME, DATA_TYPE, DATA_PRECISION, DATA_SCALE, CHAR_LENGTH, CHAR_USED,
       NULLABLE, IDENTITY_COLUMN, DATA_DEFAULT
FROM USER_TAB_COLUMNS WHERE TABLE_NAME = 'PRODUCTS' ORDER BY COLUMN_ID;
SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE, STATUS, VALIDATED, DELETE_RULE, SEARCH_CONDITION_VC
FROM USER_CONSTRAINTS WHERE TABLE_NAME = 'PRODUCTS' ORDER BY CONSTRAINT_NAME;
SELECT INDEX_NAME, UNIQUENESS, STATUS FROM USER_INDEXES WHERE TABLE_NAME = 'PRODUCTS';
DECLARE
    owner_id NUMBER;
    product_id NUMBER;
    other_id NUMBER;
    zero_id NUMBER;
    deleted_id NUMBER;
    visible_id NUMBER;
    missing_id NUMBER;
    actual_stock NUMBER;
    actual_status NUMBER;
    found PLS_INTEGER;
    token VARCHAR2(100) := 'product-check-' || RAWTOHEX(SYS_GUID()) || '@example.invalid';
    PROCEDURE reject_insert(user_value NUMBER, price_value NUMBER, stock_value NUMBER,
                            expected_code NUMBER, label VARCHAR2) IS
    BEGIN
        BEGIN
            INSERT INTO products (user_id, title, price, stock)
            VALUES (user_value, 'Probe', price_value, stock_value);
        EXCEPTION WHEN OTHERS THEN
            IF SQLCODE = expected_code THEN
                DBMS_OUTPUT.PUT_LINE('PASS rejection: ' || label);
                RETURN;
            END IF;
            RAISE;
        END;
        RAISE_APPLICATION_ERROR(-20003, 'Invalid insert accepted: ' || label);
    END;
BEGIN
    IF USER <> 'STORE_JDBC' OR SYS_CONTEXT('USERENV', 'CON_NAME') <> 'FREEPDB1' THEN
        RAISE_APPLICATION_ERROR(-20001, 'Expected STORE_JDBC in FREEPDB1');
    END IF;
    SELECT COUNT(*) INTO found FROM USER_TAB_IDENTITY_COLS
    WHERE TABLE_NAME = 'PRODUCTS' AND COLUMN_NAME = 'ID' AND GENERATION_TYPE = 'ALWAYS';
    IF found <> 1 THEN RAISE_APPLICATION_ERROR(-20004, 'Expected ALWAYS identity'); END IF;
    SELECT COUNT(*) INTO found FROM USER_INDEXES i JOIN USER_IND_COLUMNS c
      ON c.INDEX_NAME = i.INDEX_NAME
    WHERE i.TABLE_NAME = 'PRODUCTS' AND i.INDEX_NAME = 'PRODUCTS_USER_ID_IDX'
      AND i.UNIQUENESS = 'NONUNIQUE' AND i.STATUS = 'VALID'
      AND c.COLUMN_NAME = 'USER_ID' AND c.COLUMN_POSITION = 1
      AND (SELECT COUNT(*) FROM USER_IND_COLUMNS x WHERE x.INDEX_NAME = i.INDEX_NAME) = 1;
    IF found <> 1 THEN RAISE_APPLICATION_ERROR(-20004, 'Expected nonunique USER_ID index'); END IF;
    SELECT COUNT(*) INTO found FROM USER_CONSTRAINTS f JOIN USER_CONSTRAINTS p
      ON p.CONSTRAINT_NAME = f.R_CONSTRAINT_NAME AND p.OWNER = f.R_OWNER
    WHERE f.TABLE_NAME = 'PRODUCTS' AND f.CONSTRAINT_NAME = 'PRODUCTS_USER_FK'
      AND f.CONSTRAINT_TYPE = 'R' AND f.DELETE_RULE = 'NO ACTION'
      AND f.STATUS = 'ENABLED' AND f.VALIDATED = 'VALIDATED'
      AND p.TABLE_NAME = 'USERS' AND p.CONSTRAINT_TYPE = 'P';
    IF found <> 1 THEN RAISE_APPLICATION_ERROR(-20004, 'Expected enabled noncascading USERS foreign key'); END IF;
    SELECT COUNT(*) INTO found FROM USER_TAB_COLUMNS WHERE TABLE_NAME = 'PRODUCTS'
      AND COLUMN_NAME = 'STATUS_ID' AND NULLABLE = 'N' AND DATA_TYPE = 'NUMBER';
    IF found <> 1 THEN RAISE_APPLICATION_ERROR(-20004, 'Expected required status_id'); END IF;
    SELECT COUNT(*) INTO found FROM USER_CONSTRAINTS f JOIN USER_CONSTRAINTS p
      ON p.CONSTRAINT_NAME = f.R_CONSTRAINT_NAME AND p.OWNER = f.R_OWNER
    WHERE f.TABLE_NAME = 'PRODUCTS' AND f.CONSTRAINT_NAME = 'PRODUCTS_STATUS_FK'
      AND f.CONSTRAINT_TYPE = 'R' AND f.DELETE_RULE = 'NO ACTION'
      AND f.STATUS = 'ENABLED' AND f.VALIDATED = 'VALIDATED'
      AND p.TABLE_NAME = 'PRODUCT_STATUSES' AND p.CONSTRAINT_TYPE = 'P';
    IF found <> 1 THEN RAISE_APPLICATION_ERROR(-20004, 'Expected noncascading status foreign key'); END IF;
    SELECT COUNT(*) INTO found FROM product_statuses
      WHERE (id = 1 AND code = 'ACTIVE' AND name = 'Activo')
         OR (id = 2 AND code = 'INACTIVE' AND name = 'Inactivo')
         OR (id = 3 AND code = 'DELETED' AND name = 'Eliminado');
    IF found <> 3 THEN RAISE_APPLICATION_ERROR(-20004, 'Expected fixed publication statuses'); END IF;
    SAVEPOINT products_probe;
    BEGIN
        INSERT INTO users (name, lastname, email, password_hash)
        VALUES ('Product', 'Probe', token, 'not-a-real-password-hash') RETURNING id INTO owner_id;
        INSERT INTO products (user_id, title, price)
        VALUES (owner_id, 'Probe', 0) RETURNING id, stock, status_id INTO product_id, actual_stock, actual_status;
        IF product_id IS NULL OR actual_stock <> 0 OR actual_status <> 2 THEN
            RAISE_APPLICATION_ERROR(-20004, 'Identity or stock default failed');
        END IF;
        INSERT INTO products (user_id, title, price, stock, description)
        VALUES (owner_id, 'Second probe', 12.34, 2, TO_CLOB('Optional description'))
        RETURNING id INTO other_id;
        IF other_id IS NULL OR other_id = product_id THEN
            RAISE_APPLICATION_ERROR(-20004, 'Distinct identities expected');
        END IF;
        DBMS_OUTPUT.PUT_LINE('PASS: generated IDs, default stock, zero price, optional CLOB, multiple products per user.');
        BEGIN
            UPDATE products SET status_id = NULL WHERE id = product_id;
            RAISE_APPLICATION_ERROR(-20003, 'NULL status accepted');
        EXCEPTION WHEN OTHERS THEN
            IF SQLCODE <> -1407 THEN RAISE; END IF;
        END;
        BEGIN
            UPDATE products SET status_id = -1 WHERE id = product_id;
            RAISE_APPLICATION_ERROR(-20003, 'Unknown status accepted');
        EXCEPTION WHEN OTHERS THEN
            IF SQLCODE <> -2291 THEN RAISE; END IF;
        END;
        DBMS_OUTPUT.PUT_LINE('PASS: INACTIVE default, required status and status foreign key.');
        -- Restocking an inactive probe must not change its publication status.
        UPDATE products SET stock = 5 WHERE id = product_id;
        UPDATE products SET status_id = (SELECT id FROM product_statuses WHERE code = 'ACTIVE') WHERE id = other_id;
        INSERT INTO products (user_id, title, price, stock, status_id)
        VALUES (owner_id, 'Active zero probe', 1, 0, (SELECT id FROM product_statuses WHERE code = 'ACTIVE'))
        RETURNING id INTO zero_id;
        INSERT INTO products (user_id, title, price, stock, status_id)
        VALUES (owner_id, 'Deleted probe', 1, 5, (SELECT id FROM product_statuses WHERE code = 'DELETED'))
        RETURNING id INTO deleted_id;
        UPDATE products SET stock = 10 WHERE id = deleted_id;
        SELECT COUNT(*) INTO found FROM products
        WHERE user_id = owner_id AND stock > 0
          AND status_id IN (SELECT id FROM product_statuses WHERE code = 'ACTIVE');
        IF found <> 1 THEN RAISE_APPLICATION_ERROR(-20004, 'Visibility filter failed'); END IF;
        SELECT id INTO visible_id FROM products
        WHERE user_id = owner_id AND stock > 0
          AND status_id IN (SELECT id FROM product_statuses WHERE code = 'ACTIVE')
        ORDER BY id OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY;
        IF visible_id <> other_id THEN RAISE_APPLICATION_ERROR(-20004, 'Visible pagination failed'); END IF;
        SELECT COUNT(*) INTO found FROM (
            SELECT id FROM products WHERE user_id = owner_id AND stock > 0
              AND status_id IN (SELECT id FROM product_statuses WHERE code = 'ACTIVE')
            ORDER BY id OFFSET 1 ROWS FETCH NEXT 1 ROWS ONLY);
        IF found <> 0 THEN RAISE_APPLICATION_ERROR(-20004, 'Hidden rows entered pagination'); END IF;
        DBMS_OUTPUT.PUT_LINE('PASS: ACTIVE positive-stock visibility; hidden paused/deleted/zero-stock probes excluded before pagination.');
        SELECT NVL(MIN(id), 0) - 1 INTO missing_id FROM users;
        reject_insert(missing_id, 1, 0, -2291, 'invalid user_id');
        reject_insert(owner_id, -0.01, 0, -2290, 'negative price');
        reject_insert(owner_id, 1, -1, -2290, 'negative stock');
        reject_insert(NULL, 1, 0, -1400, 'NULL user_id');
        reject_insert(owner_id, NULL, 0, -1400, 'NULL price');
        reject_insert(owner_id, 1, NULL, -1400, 'NULL stock');
        BEGIN
            DELETE FROM users WHERE id = owner_id;
            RAISE_APPLICATION_ERROR(-20003, 'Parent deletion accepted');
        EXCEPTION WHEN OTHERS THEN
            IF SQLCODE <> -2292 THEN RAISE; END IF;
            DBMS_OUTPUT.PUT_LINE('PASS: parent deletion rejected; no cascading deletes.');
        END;
        ROLLBACK TO products_probe;
    EXCEPTION WHEN OTHERS THEN
        ROLLBACK TO products_probe;
        RAISE;
    END;
    SELECT COUNT(*) INTO found FROM users WHERE email = token;
    IF found <> 0 THEN RAISE_APPLICATION_ERROR(-20005, 'Probe user remains'); END IF;
    SELECT COUNT(*) INTO found FROM products WHERE id IN (product_id, other_id, zero_id, deleted_id);
    IF found <> 0 THEN RAISE_APPLICATION_ERROR(-20005, 'Probe products remain'); END IF;
    DBMS_OUTPUT.PUT_LINE('PASS: all probe rows rolled back.');
END;
/
ROLLBACK;
EXIT SUCCESS
