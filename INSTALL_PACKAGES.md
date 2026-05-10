# GateLaunch Package Manager Commands

📦 **تثبيت المكتبات الجديدة للإصدار 2.0**

## التثبيت السريع

```powershell
# إضافة المكتبات الأساسية الجديدة
npm install jsonwebtoken@^9.0.2 ws@^8.16.0 redis@^4.6.12 winston@^3.11.0 helmet@^7.1.0 compression@^1.7.4 morgan@^1.10.0 joi@^17.11.0

# إضافة مكتبات التطوير
npm install --save-dev jest@^29.7.0 supertest@^6.3.4 eslint@^8.56.0 prettier@^3.2.4 nodemon@^3.0.3
```

## أو يدويًا واحدة تلو الأخرى:

### المكتبات الأساسية (Production)

```powershell
# JWT Authentication
npm install jsonwebtoken

# WebSocket
npm install ws

# Redis Cache
npm install redis

# Logging
npm install winston winston-daily-rotate-file

# Security
npm install helmet cors

# Performance
npm install compression

# HTTP Logger
npm install morgan

# Validation
npm install joi express-validator

# File Upload
npm install multer

# UUID Generator
npm install uuid
```

### مكتبات التطوير (Development)

```powershell
# Testing
npm install --save-dev jest supertest

# Code Quality
npm install --save-dev eslint eslint-config-prettier eslint-plugin-node

# Formatting
npm install --save-dev prettier

# Hot Reload
npm install --save-dev nodemon

# TypeScript Types (optional)
npm install --save-dev @types/express @types/node
```

## التحقق من التثبيت

```powershell
# التحقق من جميع المكتبات
npm list --depth=0

# التحقق من وجود ثغرات أمنية
npm audit

# إصلاح الثغرات الأمنية تلقائياً
npm audit fix
```

## إزالة المكتبات القديمة (اختياري)

إذا كنت تريد البدء من الصفر:

```powershell
# إزالة node_modules
Remove-Item -Recurse -Force node_modules

# إزالة package-lock.json
Remove-Item -Force package-lock.json

# إعادة التثبيت
npm install
```

بعد التثبيت، يمكنك تشغيل المشروع بـ:

```powershell
npm run dev
```
