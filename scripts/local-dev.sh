#!/bin/bash
# Local Development Script
# Starts Postgres in Docker and runs the Go app natively

set -e

echo "🚀 Starting local development environment..."

# Start local Postgres
echo "📦 Starting local Postgres..."
docker-compose -f docker-compose.local.yml up -d

# Wait for Postgres to be ready
echo "⏳ Waiting for Postgres to be ready..."
until docker exec glyfs_local_db pg_isready -U glyfs -d glyfs > /dev/null 2>&1; do
  sleep 1
done
echo "✅ Postgres is ready!"

# Copy local env file if .env doesn't exist
if [ ! -f .env ]; then
  echo "📋 Creating .env from .env.local..."
  cp .env.local .env
fi

# Run database migrations (if you have them)
# echo "🔄 Running database migrations..."
# go run cmd/migrate/main.go up

# Start the Go backend
echo "🏃 Starting Go backend..."
go run cmd/server/main.go &
BACKEND_PID=$!

# Start the frontend dev server (if needed)
echo "🎨 Starting frontend dev server..."
cd cmd/client
npm run dev &
FRONTEND_PID=$!

# Trap to clean up on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; docker-compose -f docker-compose.local.yml down" EXIT

echo "✅ Development environment is running!"
echo "   Backend: http://localhost:8080"
echo "   Frontend: http://localhost:5173"
echo "   Database: postgres://glyfs:glyfs_local_dev@localhost:5432/glyfs"
echo ""
echo "Press Ctrl+C to stop all services..."

# Wait for interrupt
wait