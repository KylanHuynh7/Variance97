#!/usr/bin/env bash
# Variance97 data pipeline — one-shot CLI wrapper.
# Run from any directory; resolves repo root from the script's own location.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "[$(date)] variance97 update — repo: $REPO_ROOT"
python3 data/build/update_all.py
echo "[$(date)] done."
