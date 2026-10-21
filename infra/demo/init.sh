#!/usr/bin/env bash
set -Eeuo pipefail
# Only this hook owns demo provisioning. Never call the local setup.py helper.
trap 'echo "DEMO: application schema initialization failed; inspect Oracle logs." >&2' ERR
run_sql() {
    local output status=0
    output=$(sqlplus -L -s "$@") || status=$?
    output=${output//"$DEMO_DB_PASSWORD"/[REDACTED]}
    printf '%s\n' "$output"
    if (( status != 0 )) || [[ "$output" =~ (ORA|SP2|TNS)-[0-9]+ ]]; then
        return 1
    fi
}
if [[ ! ${DEMO_DB_PASSWORD:-} =~ ^[A-Za-z][A-Za-z0-9]{11,127}$ ]]; then
    echo 'DEMO: invalid DEMO_DB_PASSWORD format.' >&2
    exit 1
fi

# Keep credentials on stdin, with SQL*Plus echo and substitution disabled.
# setup.sql exits SQL*Plus, so provisioning and application DDL use separate sessions.
{
    printf '%s\n' 'SET ECHO OFF' 'SET VERIFY OFF' 'SET DEFINE OFF' \
        'WHENEVER OSERROR EXIT FAILURE' 'WHENEVER SQLERROR EXIT FAILURE ROLLBACK' \
        'VARIABLE setup_password VARCHAR2(128)'
    printf "BEGIN :setup_password := '%s'; END;\n/\n" "$DEMO_DB_PASSWORD"
    printf '%s\n' '@/opt/demo/setup.sql'
} | run_sql / as sysdba

{
    printf '%s\n' 'SET ECHO OFF' 'SET VERIFY OFF' 'SET DEFINE OFF' \
        'WHENEVER OSERROR EXIT FAILURE' 'WHENEVER SQLERROR EXIT FAILURE ROLLBACK'
    printf 'CONNECT store_jdbc/"%s"@//localhost:1521/FREEPDB1\n' "$DEMO_DB_PASSWORD"
    printf '%s\n' '@/opt/demo/schema.sql'
} | run_sql /nolog
# A missing marker fails readiness; the marker lives with the disposable data.
touch /opt/oracle/oradata/.demo-schema-ready
echo 'DEMO: application schema initialized; USERS and PRODUCTS are empty.'
