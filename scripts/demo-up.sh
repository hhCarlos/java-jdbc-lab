#!/usr/bin/env bash
set -Eeuo pipefail
ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT"
command -v python3 >/dev/null || { echo 'Python 3 is required.' >&2; exit 1; }
command -v docker >/dev/null || { echo 'Docker with Compose is required.' >&2; exit 1; }

# Only this file supplies demo interpolation values; never source shell code or .env.
unset DEMO_ORACLE_PASSWORD DEMO_DB_PASSWORD DEMO_JWT_SECRET
python3 - "$ROOT/.env.demo" <<'PY'
import base64
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
if not path.is_file():
    sys.exit('Create .env.demo from .env.demo.example and replace all placeholders.')
values = {}
for line in path.read_text().splitlines():
    if not line.strip() or line.lstrip().startswith('#'):
        continue
    key, sep, value = line.partition('=')
    if not sep or key not in {'DEMO_ORACLE_PASSWORD', 'DEMO_DB_PASSWORD', 'DEMO_JWT_SECRET'} or key in values:
        sys.exit('Invalid or duplicate .env.demo entry; use only the template keys.')
    values[key] = value
for key in ('DEMO_ORACLE_PASSWORD', 'DEMO_DB_PASSWORD'):
    if not re.fullmatch(r'[A-Za-z][A-Za-z0-9]{11,127}', values.get(key, '')) or 'REPLACE' in values[key]:
        sys.exit(f'{key} must be 12-128 alphanumeric characters, starting with a letter; replace placeholders.')
try:
    key = base64.b64decode(values.get('DEMO_JWT_SECRET', ''), validate=True)
except ValueError:
    sys.exit('DEMO_JWT_SECRET must be valid Base64; replace the placeholder.')
if len(key) < 32:
    sys.exit('DEMO_JWT_SECRET must encode at least 32 random bytes.')
print('Demo configuration validated (secret values hidden).')
PY

compose=(docker compose --project-name jl-store-demo --project-directory "$ROOT"
    --env-file "$ROOT/.env.demo" --file "$ROOT/compose.demo.yaml")
# Python supplies portable process deadlines on macOS (no GNU timeout required).
bounded() {
    python3 - "$@" <<'PY'
import subprocess
import sys
try:
    result = subprocess.run(sys.argv[2:], timeout=int(sys.argv[1]))
except subprocess.TimeoutExpired:
    sys.exit('Demo command exceeded its time limit; inspect the scoped project diagnostics.')
sys.exit(result.returncode)
PY
}
diagnostics() {
    echo "Inspect: docker compose -p jl-store-demo --env-file '$ROOT/.env.demo' -f '$ROOT/compose.demo.yaml' ps" >&2
    echo "Logs: docker compose -p jl-store-demo --env-file '$ROOT/.env.demo' -f '$ROOT/compose.demo.yaml' logs --tail=100 oracle backend frontend" >&2
    echo "Stop: docker compose -p jl-store-demo --env-file '$ROOT/.env.demo' -f '$ROOT/compose.demo.yaml' down --timeout 30" >&2
}
trap 'echo "Demo startup failed." >&2; diagnostics' ERR
bounded 30 docker info --format 'Docker server: {{.ServerVersion}}'
bounded 30 "${compose[@]}" config --quiet
echo 'Recreating only jl-store-demo; all previous demo data will be discarded.'
# No --volumes, --remove-orphans, prune, or unscoped Docker removal.
bounded 120 "${compose[@]}" down --timeout 30
bounded 1800 "${compose[@]}" build
bounded 1250 "${compose[@]}" up --detach --wait --wait-timeout 1200
echo 'Demo ready: http://127.0.0.1:8081'
diagnostics
