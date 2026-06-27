#!/bin/sh
set -e

echo "Running database migrations..."
cd packages/backend
npx drizzle-kit migrate 2>&1 || echo "Migration warning (may already be applied)"
cd /app

echo "Seeding database (if needed)..."
node packages/backend/dist/db/seed.js 2>&1 || echo "Seed skipped (may already exist)"

echo "Starting BAIS server..."
exec node packages/backend/dist/index.js
