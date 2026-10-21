#!/usr/bin/env bash
set -Eeuo pipefail
test -f /opt/oracle/oradata/.demo-schema-ready
healthcheck.sh >/dev/null
# Read-only checks: subsequent user activity may populate USERS and PRODUCTS.
output=$(sqlplus -L -s / as sysdba <<'SQL'
SET HEADING OFF FEEDBACK OFF PAGESIZE 0
WHENEVER OSERROR EXIT FAILURE
WHENEVER SQLERROR EXIT FAILURE ROLLBACK
ALTER SESSION SET CONTAINER = FREEPDB1;
DECLARE
    found NUMBER;
BEGIN
    SELECT COUNT(*) INTO found FROM store_jdbc.product_statuses;
    IF found <> 3 THEN RAISE_APPLICATION_ERROR(-20003, 'Expected three statuses'); END IF;
    SELECT COUNT(*) INTO found FROM store_jdbc.product_statuses
    WHERE (id = 1 AND code = 'ACTIVE' AND name = 'Activo')
       OR (id = 2 AND code = 'INACTIVE' AND name = 'Inactivo')
       OR (id = 3 AND code = 'DELETED' AND name = 'Eliminado');
    IF found <> 3 THEN RAISE_APPLICATION_ERROR(-20003, 'Invalid canonical statuses'); END IF;
    SELECT COUNT(*) INTO found FROM store_jdbc.users WHERE 1 = 0;
    SELECT COUNT(*) INTO found FROM store_jdbc.products WHERE 1 = 0;
END;
/
SELECT 'DEMO_SCHEMA_READY' FROM DUAL;
EXIT SUCCESS
SQL
)
[[ "$output" == *DEMO_SCHEMA_READY* && ! "$output" =~ (ORA|SP2|TNS)-[0-9]+ ]]
