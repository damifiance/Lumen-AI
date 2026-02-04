#!/bin/bash

# Lumen AI — One-click launcher
DIR="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
  echo ""
  echo "Shutting down..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  exit 0
}
trap cleanup INT TERM

# Start backend
cd "$DIR/backend"
uvicorn app.main:app --port 8000 &
BACKEND_PID=$!

# Start frontend
cd "$DIR/frontend"
npx vite --port 5173 &
FRONTEND_PID=$!

# Wait for frontend to be ready, then open browser
sleep 3
open "http://localhost:5173"

echo ""
echo "Lumen AI is running!"
echo "  → http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop."
echo ""

wait
