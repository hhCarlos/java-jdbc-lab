#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

exec python3 infra/database/setup.py --verify-only
