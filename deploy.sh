#!/bin/bash

# GateLaunch Deployment Script
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
echo "🚀 Starting deployment to $ENVIRONMENT..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    exit 1
fi

print_success "Docker found"

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed"
    exit 1
fi

print_success "Docker Compose found"

# Pull latest changes
print_warning "Pulling latest changes..."
git pull origin main

# Build Docker image
print_warning "Building Docker image..."
docker build -t gatelaunch:latest .
print_success "Docker image built"

# Stop running containers
print_warning "Stopping running containers..."
docker-compose down

# Start new containers
print_warning "Starting new containers..."
docker-compose up -d
print_success "Containers started"

# Wait for services to be ready
print_warning "Waiting for services to start..."
sleep 10

# Health check
print_warning "Running health check..."
if curl -f http://localhost:3000/api/health &> /dev/null; then
    print_success "Health check passed"
else
    print_error "Health check failed"
    exit 1
fi

# Run database migrations (if any)
# print_warning "Running database migrations..."
# docker-compose exec app npm run migration:up

# Create backup
print_warning "Creating backup..."
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).tar.gz"
docker-compose exec app npm run backup

print_success "Deployment completed successfully!"
echo ""
echo "Application is running at: http://localhost:3000"
echo "Logs: docker-compose logs -f"
