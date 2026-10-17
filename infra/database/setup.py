#!/usr/bin/env python3
"""Provision and/or verify STORE_JDBC without exposing passwords in command arguments."""
import argparse
import os
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--verify-only', action='store_true')
    mode.add_argument('--users-table', action='store_true',
                      help='Create/validate USERS and run rollback-only insert checks as STORE_JDBC')
    mode.add_argument('--products-table', action='store_true',
                      help='Create PRODUCTS without changing USERS; run rollback-only checks')
    mode.add_argument('--product-statuses', action='store_true',
                      help='Migrate existing PRODUCTS publication statuses, preserving data')
    args = parser.parse_args()
    values = {}
    env_file = ROOT / '.env'
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.strip() and not line.lstrip().startswith('#'):
                key, separator, value = line.partition('=')
                if not separator:
                    raise ValueError('Invalid .env entry')
                values[key.strip()] = value.strip()
    values.update(os.environ)
    if values.get('DB_USERNAME') != 'store_jdbc' or values.get('DB_SERVICE', 'FREEPDB1') != 'FREEPDB1':
        raise ValueError('Set DB_USERNAME=store_jdbc and DB_SERVICE=FREEPDB1')
    password = values.get('DB_PASSWORD', '')
    # This project's generated local passwords follow this format. Restrict SQL input
    # deliberately rather than accepting SQL*Plus metacharacters or substitutions.
    if not re.fullmatch(r'[A-Za-z][A-Za-z0-9]{11,127}', password):
        raise ValueError('DB_PASSWORD must be 12–128 alphanumeric characters, starting with a letter')

    def run_sql(sql, administrative=False):
        command = ['docker', 'compose', 'exec', '-T', 'oracle', 'sqlplus', '-L', '-s']
        command += ['/', 'as', 'sysdba'] if administrative else ['/nolog']
        result = subprocess.run(command, input=sql, text=True, cwd=ROOT,
                                capture_output=True)
        output = result.stdout + result.stderr
        # SQL*Plus can echo source lines on error: redact even failure output.
        for key, secret in values.items():
            if 'PASSWORD' in key and secret:
                output = output.replace(secret, '<redacted>')
        print(output, end='')
        if result.returncode or re.search(r'\b(?:ORA|SP2|TNS)-\d+', output):
            raise RuntimeError('Oracle command failed; existing passwords were not changed')
        return output

    if not args.verify_only and not args.users_table and not args.products_table and not args.product_statuses:
        prefix = ("SET ECHO OFF\nSET VERIFY OFF\nSET DEFINE OFF\n"
                  "WHENEVER SQLERROR EXIT FAILURE\n"
                  "VARIABLE setup_password VARCHAR2(128)\n"
                  f"BEGIN :setup_password := '{password}'; END;\n/\n")
        run_sql(prefix + Path(__file__).with_name('setup.sql').read_text(), administrative=True)

    output = run_sql(
        'SET ECHO OFF\nSET VERIFY OFF\nSET DEFINE OFF\n'
        'WHENEVER OSERROR EXIT FAILURE\nWHENEVER SQLERROR EXIT FAILURE\n'
        f'CONNECT store_jdbc/"{password}"@//localhost:1521/FREEPDB1\n'
        'SELECT USER AS APPLICATION_USER FROM DUAL;\n'
        'SELECT 1 FROM DUAL;\n'
        "SELECT CASE WHEN USER = 'STORE_JDBC' THEN 'STORE_JDBC_CONNECTION_OK' "
        "ELSE 'WRONG_USER' END AS VERIFICATION FROM DUAL;\nEXIT SUCCESS\n")
    if 'STORE_JDBC_CONNECTION_OK' not in output:
        raise RuntimeError('Application connection was not confirmed')
    print('PASS: connected to FREEPDB1 as STORE_JDBC and executed SELECT 1 FROM DUAL.')
    if args.users_table or args.products_table or args.product_statuses:
        connection = (
            'SET ECHO OFF\nSET VERIFY OFF\nSET DEFINE OFF\n'
            'WHENEVER OSERROR EXIT FAILURE\nWHENEVER SQLERROR EXIT FAILURE ROLLBACK\n'
            f'CONNECT store_jdbc/"{password}"@//localhost:1521/FREEPDB1\n')
        if args.product_statuses:
            filenames = ('product_statuses.sql', 'migrate_product_statuses.sql', 'verify_products.sql')
        elif args.products_table:
            filenames = ('product_statuses.sql', 'products.sql', 'verify_products.sql')
        else:
            filenames = ('users.sql', 'verify_users.sql')
        for filename in filenames:
            prefix = connection
            if filename == 'product_statuses.sql':
                ddl = Path(__file__).with_name('tables').joinpath('product_statuses.sql').read_text().strip().rstrip(';')
                seeds = Path(__file__).with_name('tables').joinpath('product_statuses_seed.sql').read_text().split(';')
                for bind, statement in [('statuses_ddl', ddl)] + [
                        (f'status_seed_{i + 1}', seed.strip()) for i, seed in enumerate(seeds) if seed.strip()]:
                    prefix += (f"VARIABLE {bind} VARCHAR2(4000)\n"
                               f"BEGIN :{bind} := '" + statement.replace("'", "''") + "'; END;\n/\n")
            if filename == 'users.sql':
                ddl = Path(__file__).with_name('tables').joinpath('users.sql').read_text().strip().rstrip(';')
                prefix += ("VARIABLE users_ddl VARCHAR2(4000)\n"
                           "BEGIN :users_ddl := '" + ddl.replace("'", "''") + "'; END;\n/\n")
            if filename == 'products.sql':
                statements = Path(__file__).with_name('tables').joinpath('products.sql').read_text().split(';')
                for bind, ddl in zip(('products_ddl', 'products_index_ddl'), statements[:2]):
                    prefix += (f"VARIABLE {bind} VARCHAR2(4000)\n"
                               f"BEGIN :{bind} := '" + ddl.strip().replace("'", "''") + "'; END;\n/\n")
            run_sql(prefix + Path(__file__).with_name(filename).read_text())


if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError, OSError) as error:
        print(f'ERROR: {error}', file=sys.stderr)
        sys.exit(1)
