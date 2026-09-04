#!/usr/bin/env bash
# Variance97 data pipeline — one-shot CLI wrapper.
# Run from any directory; resolves repo root from the script's own location.
#
# Two steps:
#   1. update_all.py  — refresh the CSVs from the NHL API (Phase 4)
#   2. export_web.py  — recompute web/public/data.json for the static site
#
# Commit the changed CSVs *and* web/public/data.json; the deployment rebuilds
# from that JSON, so skipping step 2 leaves the site showing stale numbers.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "[$(date)] variance97 update — repo: $REPO_ROOT"
python3 data/build/update_all.py
python3 data/build/export_web.py
echo "[$(date)] done."
