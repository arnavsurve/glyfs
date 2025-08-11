#!/bin/bash

# Glyfs Rollback Script
# Quick rollback to previous version

set -e

# Configuration
ECR_REGISTRY=${ECR_REGISTRY:-""}
ECR_REPOSITORY=${ECR_REPOSITORY:-"glyfs"}
AWS_REGION=${AWS_REGION:-"us-west-1"}
CONTAINER_NAME="glyfs-app"
ENV_FILE="/home/ec2-user/.env.production"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_warning "⚠️  Starting rollback process..."

# Check if rollback image exists
if ! docker images | grep -q "$ECR_REPOSITORY.*rollback"; then
    log_error "No rollback image found!"
    log_info "Available images:"
    docker images | grep $ECR_REPOSITORY || true
    exit 1
fi

# Stop current container
log_info "Stopping current container..."
docker stop $CONTAINER_NAME || true
docker rm $CONTAINER_NAME || true

# Start rollback container
log_info "Starting rollback container..."
docker run -d \
    --name $CONTAINER_NAME \
    --restart unless-stopped \
    -p 8080:8080 \
    --env-file $ENV_FILE \
    --log-driver json-file \
    --log-opt max-size=10m \
    --log-opt max-file=3 \
    $ECR_REGISTRY/$ECR_REPOSITORY:rollback

# Health check
sleep 5
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    log_info "Rollback successful!"
    docker ps --filter "name=$CONTAINER_NAME"
else
    log_error "Rollback failed! Manual intervention required."
    docker logs $CONTAINER_NAME
    exit 1
fi
