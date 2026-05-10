# GateLaunch Deployment Script for Windows
# Usage: .\deploy.ps1 [environment]

param(
    [string]$Environment = "production"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting deployment to $Environment..." -ForegroundColor Cyan

# Functions
function Print-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Print-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Print-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

# Check Docker
try {
    docker --version | Out-Null
    Print-Success "Docker found"
} catch {
    Print-Error "Docker is not installed"
    exit 1
}

# Check Docker Compose
try {
    docker-compose --version | Out-Null
    Print-Success "Docker Compose found"
} catch {
    Print-Error "Docker Compose is not installed"
    exit 1
}

# Pull latest changes
Print-Warning "Pulling latest changes..."
git pull origin main

# Build Docker image
Print-Warning "Building Docker image..."
docker build -t gatelaunch:latest .
Print-Success "Docker image built"

# Stop running containers
Print-Warning "Stopping running containers..."
docker-compose down

# Start new containers
Print-Warning "Starting new containers..."
docker-compose up -d
Print-Success "Containers started"

# Wait for services
Print-Warning "Waiting for services to start..."
Start-Sleep -Seconds 10

# Health check
Print-Warning "Running health check..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Print-Success "Health check passed"
    } else {
        Print-Error "Health check failed"
        exit 1
    }
} catch {
    Print-Error "Health check failed: $_"
    exit 1
}

# Create backup
Print-Warning "Creating backup..."
$backupFile = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').tar.gz"
docker-compose exec -T app npm run backup

Print-Success "Deployment completed successfully!"
Write-Host ""
Write-Host "Application is running at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Logs: docker-compose logs -f" -ForegroundColor Cyan
