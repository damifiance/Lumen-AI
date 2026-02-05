#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "==> Building frontend..."
cd "$FRONTEND_DIR"

npm install
npm run build

echo "==> Frontend build complete: $FRONTEND_DIR/dist/"
