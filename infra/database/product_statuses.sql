-- Canonical DDL and seed binds supplied by setup.py.
SET SERVEROUTPUT ON
WHENEVER SQLERROR EXIT FAILURE ROLLBACK
DECLARE
    found PLS_INTEGER;
BEGIN
    IF USER <> 'STORE_JDBC' OR SYS_CONTEXT('USERENV', 'CON_NAME') <> 'FREEPDB1' THEN
        RAISE_APPLICATION_ERROR(-20001, 'Expected STORE_JDBC in FREEPDB1');
    END IF;
    SELECT COUNT(*) INTO found FROM USER_TABLES WHERE TABLE_NAME = 'PRODUCT_STATUSES';
    IF found = 0 THEN EXECUTE IMMEDIATE :statuses_ddl; END IF;
    FOR expected IN (SELECT 1 id, 'ACTIVE' code, 'Activo' name FROM DUAL UNION ALL
                     SELECT 2, 'INACTIVE', 'Inactivo' FROM DUAL UNION ALL
                     SELECT 3, 'DELETED', 'Eliminado' FROM DUAL) LOOP
        EXECUTE IMMEDIATE 'SELECT COUNT(*) FROM product_statuses WHERE id = :1 AND code = :2 AND name = :3'
            INTO found USING expected.id, expected.code, expected.name;
        IF found = 0 THEN
            EXECUTE IMMEDIATE 'SELECT COUNT(*) FROM product_statuses WHERE id = :1 OR code = :2'
                INTO found USING expected.id, expected.code;
            IF found > 0 THEN RAISE_APPLICATION_ERROR(-20011, 'Conflicting fixed product status'); END IF;
            IF expected.id = 1 THEN EXECUTE IMMEDIATE :status_seed_1;
            ELSIF expected.id = 2 THEN EXECUTE IMMEDIATE :status_seed_2;
            ELSE EXECUTE IMMEDIATE :status_seed_3; END IF;
        END IF;
    END LOOP;
    COMMIT;
    DBMS_OUTPUT.PUT_LINE('PASS: fixed product statuses seeded and validated.');
END;
/
EXIT SUCCESS
