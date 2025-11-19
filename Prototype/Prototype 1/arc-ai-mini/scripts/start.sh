#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo ">>> Installing root dependencies"
npm install

echo ">>> Installing service and web dependencies"
npm run install:all

echo ">>> Starting services and web UI (Ctrl+C to stop)"
exec npm run dev

