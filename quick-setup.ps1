# GateLaunch V2.0 - Quick Setup Script
# Run this after installing Node.js

Write-Host "`n╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     🚀 GateLaunch V2.0 - إعداد سريع                    ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Check Node.js installation
Write-Host "🔍 التحقق من Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node -v
    $npmVersion = npm -v
    Write-Host "✓ Node.js $nodeVersion" -ForegroundColor Green
    Write-Host "✓ npm $npmVersion`n" -ForegroundColor Green
} catch {
    Write-Host "`n❌ خطأ: Node.js غير مثبت!" -ForegroundColor Red
    Write-Host "📥 يرجى تثبيت Node.js من: https://nodejs.org`n" -ForegroundColor Yellow
    Read-Host "اضغط Enter للخروج"
    exit 1
}

# Check if node_modules exists
Write-Host "📦 التحقق من المكتبات..." -ForegroundColor Yellow
if (-Not (Test-Path "node_modules")) {
    Write-Host "⚠️  المكتبات غير مثبتة. جاري التثبيت...`n" -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌ فشل تثبيت المكتبات!" -ForegroundColor Red
        Read-Host "اضغط Enter للخروج"
        exit 1
    }
    Write-Host "`n✓ تم تثبيت المكتبات بنجاح`n" -ForegroundColor Green
} else {
    Write-Host "✓ المكتبات مثبتة بالفعل`n" -ForegroundColor Green
}

# Check if .env exists
Write-Host "⚙️  التحقق من ملف الإعدادات..." -ForegroundColor Yellow
if (-Not (Test-Path ".env")) {
    Write-Host "⚠️  ملف .env غير موجود. جاري الإنشاء...`n" -ForegroundColor Yellow
    
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

# Demo Users (disable in production)
DEMO_SEED_USERS=true

# Redis (optional - will use memory fallback)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=false

# Logging
LOG_LEVEL=debug
LOG_DIR=logs

# Integrations (optional - add your tokens)
# TELEGRAM_BOT_TOKEN=your_token
# TELEGRAM_CHAT_ID=your_chat_id
# SLACK_WEBHOOK_URL=your_webhook
# N8N_WEBHOOK_URL=your_n8n_webhook
"@
    
    $envContent | Out-File -FilePath ".env" -Encoding utf8 -NoNewline
    Write-Host "✓ تم إنشاء ملف .env بنجاح`n" -ForegroundColor Green
} else {
    Write-Host "✓ ملف .env موجود بالفعل`n" -ForegroundColor Green
}

# Check if storage directory exists
Write-Host "📁 التحقق من مجلد التخزين..." -ForegroundColor Yellow
if (-Not (Test-Path "storage")) {
    New-Item -ItemType Directory -Path "storage" -Force | Out-Null
    Write-Host "✓ تم إنشاء مجلد storage`n" -ForegroundColor Green
} else {
    Write-Host "✓ مجلد storage موجود`n" -ForegroundColor Green
}

# Check if logs directory exists
if (-Not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" -Force | Out-Null
    Write-Host "✓ تم إنشاء مجلد logs`n" -ForegroundColor Green
}

# Success message
Write-Host "`n╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║     ✅ الإعداد اكتمل بنجاح!                             ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "🎯 الخطوة التالية - تشغيل المشروع:`n" -ForegroundColor Cyan
Write-Host "   للتطوير:    npm run dev" -ForegroundColor White
Write-Host "   للإنتاج:    npm start`n" -ForegroundColor White

Write-Host "🌐 بعد التشغيل، افتح المتصفح على:" -ForegroundColor Cyan
Write-Host "   http://localhost:3000/index.html`n" -ForegroundColor White

Write-Host "🔑 بيانات الدخول الافتراضية:" -ForegroundColor Cyan
Write-Host "   الإدارة:   admin.demo@university.edu / admin1234" -ForegroundColor White
Write-Host "   مشرف:      supervisor.demo@university.edu / super1234" -ForegroundColor White
Write-Host "   مستخدم:    user.demo@university.edu / user1234`n" -ForegroundColor White

Write-Host "📚 للمساعدة، راجع:" -ForegroundColor Cyan
Write-Host "   - START_AR.md (دليل باللغة العربية)" -ForegroundColor White
Write-Host "   - README.md" -ForegroundColor White
Write-Host "   - TROUBLESHOOTING.md`n" -ForegroundColor White

$answer = Read-Host "هل تريد تشغيل المشروع الآن؟ (y/n)"
if ($answer -eq "y" -or $answer -eq "Y" -or $answer -eq "yes" -or $answer -eq "نعم") {
    Write-Host "`n🚀 جاري تشغيل المشروع...`n" -ForegroundColor Green
    npm run dev
} else {
    Write-Host "`n👋 شكراً! يمكنك التشغيل لاحقاً بالأمر: npm run dev`n" -ForegroundColor Cyan
}
