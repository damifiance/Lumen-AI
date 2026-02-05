#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"

echo "==> Building backend with PyInstaller..."
cd "$BACKEND_DIR"

# Ensure pyinstaller is available
pip install pyinstaller 2>/dev/null || true

pyinstaller lumen-backend.spec --clean --noconfirm

echo "==> Backend build complete: $BACKEND_DIR/dist/lumen-backend/"
