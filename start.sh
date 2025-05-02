#!/bin/bash
set -e
# Start Extractinator backend in production mode
cd /app/apps/backend && node src/index.js &
BACKEND_PID=$!

# Serve frontend static build using vite preview (production mode)
cd /app/apps/frontend
if [ ! -d dist ]; then
  echo "No frontend build found, building..."
  npm run build
fi
npx vite preview --host 0.0.0.0 --port 5574

wait $BACKEND_PID
