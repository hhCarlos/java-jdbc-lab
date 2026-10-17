-- Run as STORE_JDBC in existing FREEPDB1 using: python3 infra/database/setup.py --users-table
SET ECHO OFF
SET VERIFY OFF
SET DEFINE OFF
SET SERVEROUTPUT ON
WHENEVER OSERROR EXIT FAILURE
WHENEVER SQLERROR EXIT FAILURE ROLLBACK

BEGIN
    IF USER <> 'STORE_JDBC' OR SYS_CONTEXT('USERENV', 'CON_NAME') <> 'FREEPDB1' THEN
        RAISE_APPLICATION_ERROR(-20001, 'Expected STORE_JDBC in FREEPDB1');
    END IF;
END;
/

DECLARE
    found PLS_INTEGER;
BEGIN
    SELECT COUNT(*) INTO found FROM USER_TABLES WHERE TABLE_NAME = 'USERS';
    IF found = 0 THEN
        EXECUTE IMMEDIATE :users_ddl;
        DBMS_OUTPUT.PUT_LINE('Created STORE_JDBC.USERS.');
    ELSE
        DBMS_OUTPUT.PUT_LINE('USERS exists; validating without altering its structure or data.');
    END IF;
END;
/

DECLARE
    errors PLS_INTEGER := 0;
    found PLS_INTEGER;
    normalized VARCHAR2(4000);
    PROCEDURE require_matches(ok BOOLEAN, message VARCHAR2) IS
    BEGIN
        IF ok IS NULL OR NOT ok THEN
            errors := errors + 1;
            DBMS_OUTPUT.PUT_LINE('DISCREPANCY: ' || message);
        END IF;
    END;
    FUNCTION canonical(expression VARCHAR2) RETURN VARCHAR2 IS
    BEGIN
        RETURN REGEXP_REPLACE(UPPER(expression), '[[:space:]"()]', '');
    END;
BEGIN
    SELECT COUNT(*) INTO found FROM USER_TAB_COLS WHERE TABLE_NAME = 'USERS';
    require_matches(found = 7, 'Expected exactly seven columns, including hidden columns');

    FOR spec IN (
        SELECT 'ID' col, 1 pos, 'NUMBER' typ, 0 len FROM DUAL UNION ALL
        SELECT 'NAME', 2, 'VARCHAR2', 50 FROM DUAL UNION ALL
        SELECT 'LASTNAME', 3, 'VARCHAR2', 50 FROM DUAL UNION ALL
        SELECT 'EMAIL', 4, 'VARCHAR2', 254 FROM DUAL UNION ALL
        SELECT 'PASSWORD_HASH', 5, 'VARCHAR2', 512 FROM DUAL UNION ALL
        SELECT 'CREATED_AT', 6, 'TIMESTAMP(6) WITH TIME ZONE', 0 FROM DUAL UNION ALL
        SELECT 'UPDATED_AT', 7, 'TIMESTAMP(6) WITH TIME ZONE', 0 FROM DUAL
    ) LOOP
        found := 0;
        FOR c IN (SELECT * FROM USER_TAB_COLS WHERE TABLE_NAME = 'USERS' AND COLUMN_NAME = spec.col) LOOP
            found := found + 1;
            require_matches(c.COLUMN_ID = spec.pos AND c.DATA_TYPE = spec.typ AND c.NULLABLE = 'N'
                AND c.VIRTUAL_COLUMN = 'NO' AND c.HIDDEN_COLUMN = 'NO', spec.col || ': type/order/nullability');
            IF spec.len > 0 THEN
                require_matches(c.CHAR_USED = 'C' AND c.CHAR_LENGTH = spec.len, spec.col || ': CHAR length');
            END IF;
            IF spec.col = 'ID' THEN
                require_matches(c.IDENTITY_COLUMN = 'YES' AND c.DATA_PRECISION IS NULL
                    AND c.DATA_SCALE IS NULL, 'ID: unconstrained NUMBER identity');
            ELSE
                require_matches(c.IDENTITY_COLUMN = 'NO', spec.col || ': unexpected identity');
                normalized := canonical(c.DATA_DEFAULT);
                IF spec.col IN ('CREATED_AT', 'UPDATED_AT') THEN
                    require_matches(normalized = 'SYSTIMESTAMP', spec.col || ': expected SYSTIMESTAMP default');
                ELSE
                    require_matches(c.DATA_DEFAULT IS NULL, spec.col || ': unexpected default');
                END IF;
            END IF;
        END LOOP;
        require_matches(found = 1, 'Missing column ' || spec.col);
    END LOOP;

    SELECT COUNT(*) INTO found FROM USER_TAB_IDENTITY_COLS
    WHERE TABLE_NAME = 'USERS' AND COLUMN_NAME = 'ID' AND GENERATION_TYPE = 'ALWAYS';
    require_matches(found = 1, 'ID must be GENERATED ALWAYS AS IDENTITY');

    FOR spec IN (SELECT 'P' kind, 'ID' col FROM DUAL UNION ALL SELECT 'U', 'EMAIL' FROM DUAL) LOOP
        SELECT COUNT(*) INTO found FROM USER_CONSTRAINTS c
        WHERE c.TABLE_NAME = 'USERS' AND c.CONSTRAINT_TYPE = spec.kind;
        require_matches(found = 1, 'Expected exactly one constraint of type ' || spec.kind);
        SELECT COUNT(*) INTO found FROM USER_CONSTRAINTS c
        WHERE c.TABLE_NAME = 'USERS' AND c.CONSTRAINT_TYPE = spec.kind
            AND c.STATUS = 'ENABLED' AND c.VALIDATED = 'VALIDATED' AND c.DEFERRABLE = 'NOT DEFERRABLE'
            AND (spec.kind = 'P' OR c.CONSTRAINT_NAME = 'USERS_EMAIL_UK')
            AND (SELECT COUNT(*) FROM USER_CONS_COLUMNS cc WHERE cc.CONSTRAINT_NAME = c.CONSTRAINT_NAME) = 1
            AND EXISTS (SELECT 1 FROM USER_CONS_COLUMNS cc WHERE cc.CONSTRAINT_NAME = c.CONSTRAINT_NAME
                AND cc.COLUMN_NAME = spec.col AND cc.POSITION = 1);
        require_matches(found = 1, 'Invalid primary/unique constraint for ' || spec.col);
    END LOOP;

    FOR spec IN (SELECT 'NAME' col FROM DUAL UNION ALL SELECT 'LASTNAME' FROM DUAL
                 UNION ALL SELECT 'PASSWORD_HASH' FROM DUAL) LOOP
        found := 0;
        FOR c IN (SELECT * FROM USER_CONSTRAINTS WHERE TABLE_NAME = 'USERS' AND CONSTRAINT_TYPE = 'C') LOOP
            IF canonical(c.SEARCH_CONDITION_VC) = 'TRIM' || spec.col || 'ISNOTNULL'
                AND c.STATUS = 'ENABLED' AND c.VALIDATED = 'VALIDATED' THEN
                found := found + 1;
            END IF;
        END LOOP;
        require_matches(found = 1, spec.col || ': expected enabled nonblank check');
    END LOOP;

    FOR c IN (SELECT * FROM USER_CONSTRAINTS WHERE TABLE_NAME = 'USERS') LOOP
        IF c.CONSTRAINT_TYPE = 'C' THEN
            normalized := canonical(c.SEARCH_CONDITION_VC);
            require_matches(normalized IN ('IDISNOTNULL', 'NAMEISNOTNULL', 'LASTNAMEISNOTNULL',
                'EMAILISNOTNULL', 'PASSWORD_HASHISNOTNULL', 'CREATED_ATISNOTNULL', 'UPDATED_ATISNOTNULL',
                'TRIMNAMEISNOTNULL', 'TRIMLASTNAMEISNOTNULL', 'TRIMPASSWORD_HASHISNOTNULL'),
                'Unexpected check ' || c.CONSTRAINT_NAME);
        ELSE
            require_matches(c.CONSTRAINT_TYPE IN ('P', 'U'), 'Unexpected constraint ' || c.CONSTRAINT_NAME);
        END IF;
        require_matches(c.STATUS = 'ENABLED' AND c.VALIDATED = 'VALIDATED', 'Inactive constraint ' || c.CONSTRAINT_NAME);
    END LOOP;

    SELECT COUNT(*) INTO found FROM USER_INDEXES WHERE TABLE_NAME = 'USERS';
    require_matches(found = 2, 'Expected only primary-key and email unique indexes');
    FOR idx IN (SELECT * FROM USER_INDEXES WHERE TABLE_NAME = 'USERS') LOOP
        require_matches(idx.UNIQUENESS = 'UNIQUE' AND idx.STATUS = 'VALID' AND idx.INDEX_TYPE = 'NORMAL',
            'Index must be valid, normal and unique: ' || idx.INDEX_NAME);
        SELECT COUNT(*) INTO found FROM USER_CONSTRAINTS
        WHERE TABLE_NAME = 'USERS' AND CONSTRAINT_TYPE IN ('P', 'U') AND INDEX_NAME = idx.INDEX_NAME;
        require_matches(found = 1, 'Redundant/unassociated index ' || idx.INDEX_NAME);
        SELECT COUNT(*) INTO found FROM USER_IND_COLUMNS WHERE INDEX_NAME = idx.INDEX_NAME;
        require_matches(found = 1, 'Expected single-column index ' || idx.INDEX_NAME);
        SELECT COUNT(*) INTO found FROM USER_IND_COLUMNS ic JOIN USER_CONSTRAINTS c
            ON c.INDEX_NAME = ic.INDEX_NAME
        WHERE ic.INDEX_NAME = idx.INDEX_NAME AND ic.COLUMN_POSITION = 1 AND ic.DESCEND = 'ASC'
            AND ((c.CONSTRAINT_TYPE = 'P' AND ic.COLUMN_NAME = 'ID')
                OR (c.CONSTRAINT_TYPE = 'U' AND ic.COLUMN_NAME = 'EMAIL'));
        require_matches(found = 1, 'Incorrect indexed column ' || idx.INDEX_NAME);
    END LOOP;
    SELECT COUNT(*) INTO found FROM USER_TRIGGERS WHERE TABLE_NAME = 'USERS';
    require_matches(found = 0, 'USERS must have no triggers');
    IF errors > 0 THEN
        RAISE_APPLICATION_ERROR(-20002, errors || ' USERS structure discrepancies; no existing data changed');
    END IF;
    DBMS_OUTPUT.PUT_LINE('PASS: USERS columns, identity, defaults, constraints and indexes match.');
END;
/

SELECT COLUMN_NAME, DATA_TYPE, CHAR_LENGTH, CHAR_USED, NULLABLE, IDENTITY_COLUMN, DATA_DEFAULT
FROM USER_TAB_COLUMNS WHERE TABLE_NAME = 'USERS' ORDER BY COLUMN_ID;
SELECT COLUMN_NAME, GENERATION_TYPE FROM USER_TAB_IDENTITY_COLS WHERE TABLE_NAME = 'USERS';
SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE, STATUS, VALIDATED, INDEX_NAME
FROM USER_CONSTRAINTS WHERE TABLE_NAME = 'USERS' ORDER BY CONSTRAINT_NAME;
SELECT INDEX_NAME, UNIQUENESS, STATUS FROM USER_INDEXES WHERE TABLE_NAME = 'USERS';
EXIT SUCCESS
