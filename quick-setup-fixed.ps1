# GateLaunch V2.0 - Quick Setup Script
# Run this after installing Node.js

Write-Host "`nGateLaunch V2.0 - Quick Setup`n" -ForegroundColor Cyan

# Check Node.js installation
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node -v
    $npmVersion = npm -v
    Write-Host "Node.js $nodeVersion - OK" -ForegroundColor Green
    Write-Host "npm $npmVersion - OK`n" -ForegroundColor Green
} catch {
    Write-Host "`nERROR: Node.js is not installed!" -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org`n" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if node_modules exists
Write-Host "Checking dependencies..." -ForegroundColor Yellow
if (-Not (Test-Path "node_modules")) {
    Write-Host "Installing packages...`n" -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`nERROR: Failed to install packages!" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "`nPackages installed successfully`n" -ForegroundColor Green
} else {
    Write-Host "Packages already installed`n" -ForegroundColor Green
}

# Check if .env exists
Write-Host "Checking configuration..." -ForegroundColor Yellow
if (-Not (Test-Path ".env")) {
    Write-Host "Creating .env file...`n" -ForegroundColor Yellow
    
    $envContent = @"
NODE_ENV=development
PORT=3000

# JWT Configuration
JWT_SECRET=gatelaunch-super-secret-jwt-key-change-in-production-$(Get-Random -Maximum 9999)
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Database
STORAGE_DRIVER=sqlite
DB_PATH=storage/gatelaunch.db

# Security
SESSION_TTL_MS=43200000
BCRYPT_ROUNDS=12

# Admin Bootstrap
ADMIN_BOOTSTRAP_EMAIL=admin@gatelaunch.edu
ADMIN_BOOTSTRAP_PASSWORD=Admin@123456

# Demo Users
DEMO_SEED_USERS=true

# Redis (optional)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=false

# Logging
LOG_LEVEL=debug
LOG_DIR=logs
"@
    
    $envContent | Out-File -FilePath ".env" -Encoding utf8 -NoNewline
    Write-Host ".env file created successfully`n" -ForegroundColor Green
} else {
    Write-Host ".env file already exists`n" -ForegroundColor Green
}

# Check if storage directory exists
Write-Host "Checking storage directories..." -ForegroundColor Yellow
if (-Not (Test-Path "storage")) {
    New-Item -ItemType Directory -Path "storage" -Force | Out-Null
    Write-Host "Created storage directory" -ForegroundColor Green
}

if (-Not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" -Force | Out-Null
    Write-Host "Created logs directory`n" -ForegroundColor Green
}

# Success message
Write-Host "`n===============================================" -ForegroundColor Green
Write-Host "Setup completed successfully!" -ForegroundColor Green
Write-Host "===============================================`n" -ForegroundColor Green

Write-Host "Next steps:`n" -ForegroundColor Cyan
Write-Host "  Development:  npm run dev" -ForegroundColor White
Write-Host "  Production:   npm start`n" -ForegroundColor White

Write-Host "Open in browser:" -ForegroundColor Cyan
Write-Host "  http://localhost:3000/index.html`n" -ForegroundColor White

Write-Host "Login credentials:" -ForegroundColor Cyan
Write-Host "  Admin:    admin.demo@university.edu / admin1234" -ForegroundColor White
Write-Host "  User:     user.demo@university.edu / user1234`n" -ForegroundColor White

$answer = Read-Host "Start the project now? (y/n)"
if ($answer -eq "y" -or $answer -eq "Y" -or $answer -eq "yes") {
    Write-Host "`nStarting GateLaunch...`n" -ForegroundColor Green
    npm run dev
} else {
    Write-Host "`nYou can start later with: npm run dev`n" -ForegroundColor Cyan
}
