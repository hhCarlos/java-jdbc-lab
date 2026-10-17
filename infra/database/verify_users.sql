-- Rollback-only checks. Identity sequence values are consumed even after rollback.
SET ECHO OFF
SET VERIFY OFF
SET DEFINE OFF
SET SERVEROUTPUT ON
WHENEVER OSERROR EXIT FAILURE
WHENEVER SQLERROR EXIT FAILURE ROLLBACK

DECLARE
    token VARCHAR2(100) := 'schema-check-' || RAWTOHEX(SYS_GUID()) || '@example.invalid';
    other_email VARCHAR2(110);
    first_id NUMBER;
    second_id NUMBER;
    created_value TIMESTAMP WITH TIME ZONE;
    updated_value TIMESTAMP WITH TIME ZONE;
    started_at TIMESTAMP WITH TIME ZONE := SYSTIMESTAMP;
    remaining PLS_INTEGER;
    checks PLS_INTEGER := 0;

    PROCEDURE expect_rejected(statement VARCHAR2, expected_code NUMBER, label VARCHAR2) IS
    BEGIN
        BEGIN
            EXECUTE IMMEDIATE statement;
        EXCEPTION WHEN OTHERS THEN
            IF SQLCODE = expected_code THEN
                checks := checks + 1;
                DBMS_OUTPUT.PUT_LINE('PASS rejection: ' || label);
                RETURN;
            END IF;
            RAISE;
        END;
        RAISE_APPLICATION_ERROR(-20003, 'Invalid insert accepted: ' || label);
    END;

    FUNCTION insert_with(changed_column VARCHAR2, expression VARCHAR2) RETURN VARCHAR2 IS
        statement VARCHAR2(4000) := 'INSERT INTO users (name, lastname, email, password_hash, created_at, updated_at) VALUES (';
        value_expression VARCHAR2(1000);
    BEGIN
        FOR c IN (SELECT 'NAME' col, 1 pos FROM DUAL UNION ALL SELECT 'LASTNAME', 2 FROM DUAL
                  UNION ALL SELECT 'EMAIL', 3 FROM DUAL UNION ALL SELECT 'PASSWORD_HASH', 4 FROM DUAL
                  UNION ALL SELECT 'CREATED_AT', 5 FROM DUAL UNION ALL SELECT 'UPDATED_AT', 6 FROM DUAL
                  ORDER BY pos) LOOP
            IF c.col = changed_column THEN
                value_expression := expression;
            ELSIF c.col = 'EMAIL' THEN
                value_expression := DBMS_ASSERT.ENQUOTE_LITERAL(other_email);
            ELSIF c.col IN ('CREATED_AT', 'UPDATED_AT') THEN
                value_expression := 'SYSTIMESTAMP';
            ELSE
                value_expression := '''valid-probe-value''';
            END IF;
            IF c.pos > 1 THEN statement := statement || ','; END IF;
            statement := statement || value_expression;
        END LOOP;
        RETURN statement || ')';
    END;
BEGIN
    IF USER <> 'STORE_JDBC' OR SYS_CONTEXT('USERENV', 'CON_NAME') <> 'FREEPDB1' THEN
        RAISE_APPLICATION_ERROR(-20001, 'Expected STORE_JDBC in FREEPDB1');
    END IF;
    other_email := 'second-' || token;
    SAVEPOINT users_probe;
    BEGIN
        INSERT INTO users (name, lastname, email, password_hash)
        VALUES ('Probe', 'User', token, 'not-a-real-password-hash')
        RETURNING id, created_at, updated_at INTO first_id, created_value, updated_value;
        IF first_id IS NULL OR created_value IS NULL OR updated_value IS NULL
            OR created_value < started_at OR created_value > SYSTIMESTAMP
            OR updated_value < started_at OR updated_value > SYSTIMESTAMP THEN
            RAISE_APPLICATION_ERROR(-20004, 'Identity or timestamp defaults failed');
        END IF;
        INSERT INTO users (name, lastname, email, password_hash)
        VALUES ('Probe', 'User', other_email, 'not-a-real-password-hash') RETURNING id INTO second_id;
        IF second_id IS NULL OR second_id = first_id THEN
            RAISE_APPLICATION_ERROR(-20004, 'Distinct generated identities expected');
        END IF;
        -- Use another unique email for all probes except the deliberate duplicate.
        other_email := 'invalid-' || token;
        DBMS_OUTPUT.PUT_LINE('PASS: two distinct generated IDs and SYSTIMESTAMP defaults.');

        expect_rejected(insert_with('EMAIL', DBMS_ASSERT.ENQUOTE_LITERAL(token)), -1, 'duplicate email');
        FOR c IN (SELECT 'NAME' col FROM DUAL UNION ALL SELECT 'LASTNAME' FROM DUAL
                  UNION ALL SELECT 'EMAIL' FROM DUAL UNION ALL SELECT 'PASSWORD_HASH' FROM DUAL
                  UNION ALL SELECT 'CREATED_AT' FROM DUAL UNION ALL SELECT 'UPDATED_AT' FROM DUAL) LOOP
            expect_rejected(insert_with(c.col, 'NULL'), -1400, c.col || ' NULL');
        END LOOP;
        FOR c IN (SELECT 'NAME' col FROM DUAL UNION ALL SELECT 'LASTNAME' FROM DUAL
                  UNION ALL SELECT 'PASSWORD_HASH' FROM DUAL) LOOP
            expect_rejected(insert_with(c.col, '''   '''), -2290, c.col || ' spaces only');
        END LOOP;
        FOR c IN (SELECT 'NAME' col, 51 len FROM DUAL UNION ALL SELECT 'LASTNAME', 51 FROM DUAL
                  UNION ALL SELECT 'EMAIL', 255 FROM DUAL UNION ALL SELECT 'PASSWORD_HASH', 513 FROM DUAL) LOOP
            expect_rejected(insert_with(c.col, 'RPAD(''x'',' || c.len || ',''x'')'), -12899, c.col || ' too long');
        END LOOP;
        expect_rejected('INSERT INTO users (id, name, lastname, email, password_hash) VALUES ('
            || first_id || ',''Probe'',''User'',' || DBMS_ASSERT.ENQUOTE_LITERAL(other_email)
            || ',''probe-hash'')', -32795, 'explicit ID on GENERATED ALWAYS identity');

        ROLLBACK TO users_probe;
    EXCEPTION WHEN OTHERS THEN
        ROLLBACK TO users_probe;
        RAISE;
    END;
    SELECT COUNT(*) INTO remaining FROM users
    WHERE email IN (token, 'second-' || token, other_email);
    IF remaining <> 0 THEN
        RAISE_APPLICATION_ERROR(-20005, 'Probe rows remain after rollback');
    END IF;
    DBMS_OUTPUT.PUT_LINE('PASS: ' || checks || ' invalid inserts rejected; all probe rows rolled back.');
END;
/
ROLLBACK;
EXIT SUCCESS
