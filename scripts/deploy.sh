#!/bin/bash

set -e

echo "🚀 Deploying Glyfs to production..."

REPO_URL="git@github.com:arnavsurve/glyfs.git"
APP_DIR="/home/ec2-user/glyfs"
BRANCH="main"

# Clone or update repository
if [ ! -d "$APP_DIR" ]; then
  echo "📦 Cloning repository..."
  git clone $REPO_URL $APP_DIR
  cd $APP_DIR
else
  echo "📦 Updating repository..."
  cd $APP_DIR
  git fetch origin
  git reset --hard origin/$BRANCH
fi

# Copy production env file if it doesn't exist
if [ ! -f .env.production ]; then
  echo "⚠️  .env.production not found!"
  echo "Please create .env.production with your production settings"
  exit 1
fi

# Build and deploy with Docker
echo "Building Docker image..."
docker-compose -f docker-compose.prod.yml build

# Stop old container
echo "Stopping old container..."
docker-compose -f docker-compose.prod.yml down || true

# Start new container
echo "Starting new container..."
docker-compose -f docker-compose.prod.yml up -d

# Health check
echo "Checking health..."
sleep 5
if curl -f http://localhost/health > /dev/null 2>&1; then
  echo "  Deployment successful!"
  echo "  Application is running at http://$(curl -s ifconfig.me)"
else
  echo "  Health check failed! Check logs with:"
  echo "  docker logs glyfs_app"
  exit 1
fi

# Clean up old images
echo "Cleaning up old images..."
docker image prune -f

echo "Deployment complete."
