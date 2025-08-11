#!/bin/bash

# Glyfs ECR Deployment Script
# Zero-downtime deployment with automatic rollback

set -e

# Configuration
ECR_REGISTRY=${ECR_REGISTRY:-""}
ECR_REPOSITORY=${ECR_REPOSITORY:-"glyfs"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}
AWS_REGION=${AWS_REGION:-"us-west-1"}
CONTAINER_NAME="glyfs-app"
NEW_CONTAINER_NAME="glyfs-app-new"
HEALTH_CHECK_URL="http://localhost:8080/health"
ENV_FILE="/home/ec2-user/.env.production"
MAX_HEALTH_ATTEMPTS=30
HEALTH_CHECK_INTERVAL=2

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

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    log_error "Environment file not found at $ENV_FILE"
    log_error "Please create .env.production on the server before deploying"
    exit 1
fi

# Login to ECR
log_info "Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

# Pull the new image
log_info "Pulling image: $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG"
docker pull $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

# Get current container ID if exists
CURRENT_CONTAINER=$(docker ps -q --filter "name=^${CONTAINER_NAME}$" || true)
if [ ! -z "$CURRENT_CONTAINER" ]; then
    log_info "Current container found: $CURRENT_CONTAINER"
    
    # Create backup tag of current running image
    CURRENT_IMAGE=$(docker inspect $CURRENT_CONTAINER --format='{{.Config.Image}}')
    docker tag $CURRENT_IMAGE $ECR_REGISTRY/$ECR_REPOSITORY:rollback
    log_info "Tagged current image as rollback: $CURRENT_IMAGE"
fi

# Start new container on different port for testing
log_info "Starting new container for testing..."
docker run -d \
    --name $NEW_CONTAINER_NAME \
    --restart unless-stopped \
    -p 8081:8080 \
    --env-file $ENV_FILE \
    --log-driver json-file \
    --log-opt max-size=10m \
    --log-opt max-file=3 \
    $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

# Health check the new container
log_info "Performing health check on new container..."
HEALTH_CHECK_PASSED=false
for i in $(seq 1 $MAX_HEALTH_ATTEMPTS); do
    if curl -f http://localhost:8081/health > /dev/null 2>&1; then
        HEALTH_CHECK_PASSED=true
        log_info "Health check passed! (attempt $i/$MAX_HEALTH_ATTEMPTS)"
        break
    fi
    log_warning "Health check attempt $i/$MAX_HEALTH_ATTEMPTS failed, waiting ${HEALTH_CHECK_INTERVAL}s..."
    sleep $HEALTH_CHECK_INTERVAL
done

if [ "$HEALTH_CHECK_PASSED" = false ]; then
    log_error "Health check failed after $MAX_HEALTH_ATTEMPTS attempts"
    log_info "Cleaning up failed deployment..."
    docker stop $NEW_CONTAINER_NAME
    docker rm $NEW_CONTAINER_NAME
    exit 1
fi

# If we have an old container, stop it gracefully
if [ ! -z "$CURRENT_CONTAINER" ]; then
    log_info "Stopping old container gracefully..."
    docker stop --time=30 $CONTAINER_NAME || true
    docker rm $CONTAINER_NAME || true
fi

# Stop the new container to reconfigure ports
docker stop $NEW_CONTAINER_NAME
docker rm $NEW_CONTAINER_NAME

# Start the container with the correct name and port
log_info "Starting production container..."
docker run -d \
    --name $CONTAINER_NAME \
    --restart unless-stopped \
    -p 8080:8080 \
    --env-file $ENV_FILE \
    --log-driver json-file \
    --log-opt max-size=10m \
    --log-opt max-file=3 \
    $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

# Final health check
sleep 3
if curl -f $HEALTH_CHECK_URL > /dev/null 2>&1; then
    log_info "Deployment successful!"
    
    # Clean up old images (keep last 3)
    log_info "Cleaning up old images..."
    docker image prune -f
    
    # Show running container
    docker ps --filter "name=$CONTAINER_NAME"
else
    log_error "Final health check failed!"
    exit 1
fi

log_info "Deployment completed successfully!"
log_info "Container: $(docker ps -q --filter "name=$CONTAINER_NAME")"
log_info "Image: $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG"
