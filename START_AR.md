# 🚀 دليل تشغيل GateLaunch V2.0

## ⚠️ المشكلة الحالية
**Node.js غير مثبت على جهازك** - هذا هو سبب فشل تشغيل المشروع.

---

## ✅ الحل الكامل (خطوات بسيطة)

### 1️⃣ تثبيت Node.js

**الرابط المباشر:** https://nodejs.org/en/download

**الخطوات:**
1. افتح الرابط في المتصفح
2. حمّل النسخة **LTS** (Long Term Support) - النسخة الموصى بها
3. شغّل ملف التثبيت واتبع التعليمات
4. **مهم:** بعد التثبيت، أغلق وأعد فتح PowerShell

**التحقق من التثبيت:**
```powershell
node -v
npm -v
```
يجب أن ترى رقم الإصدار لكل منهما (مثل: v18.19.0 و 10.2.3)

---

### 2️⃣ تثبيت المكتبات المطلوبة

بعد تثبيت Node.js، افتح PowerShell في مجلد المشروع:

```powershell
cd "c:\Users\tamat\OneDrive\Desktop\New folder"
npm install
```

⏱️ **سيستغرق من 2-5 دقائق** - ستظهر رسائل التحميل وهذا طبيعي.

✅ بعد الانتهاء، يجب أن يظهر مجلد `node_modules` جديد.

---

### 3️⃣ إنشاء ملف الإعدادات (.env)

قبل التشغيل، يجب إنشاء ملف `.env` في مجلد المشروع:

```powershell
# يمكنك نسخ هذا الأمر مباشرة:
@"
NODE_ENV=development
PORT=3000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
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

# Redis (optional - will use memory fallback if not available)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=false

# Logging
LOG_LEVEL=debug
LOG_DIR=logs

# Integrations (optional)
# TELEGRAM_BOT_TOKEN=your_token
# TELEGRAM_CHAT_ID=your_chat_id
# SLACK_WEBHOOK_URL=your_webhook
# N8N_WEBHOOK_URL=your_n8n_webhook
"@ | Out-File -FilePath .env -Encoding utf8
```

✅ سيتم إنشاء ملف `.env` تلقائياً.

---

### 4️⃣ تشغيل المشروع

#### 🔧 وضع التطوير (Development Mode):
```powershell
npm run dev
```

#### ▶️ الوضع الإنتاجي (Production Mode):
```powershell
npm start
```

---

## 📖 بعد التشغيل الناجح

ستظهر رسالة مثل:
```
🚀 GateLaunch V2.0 Server running on http://localhost:3000
✓ Database initialized
✓ WebSocket server started on port: 3001
```

**افتح المتصفح على:**
- الصفحة الرئيسية: http://localhost:3000/index.html
- لوحة الإدارة: http://localhost:3000/admin.html

---

## 🔑 بيانات الدخول الافتراضية

### حساب الإدارة (Admin):
- **البريد:** admin.demo@university.edu
- **كلمة المرور:** admin1234

### حساب المشرف (Supervisor):
- **البريد:** supervisor.demo@university.edu
- **كلمة المرور:** super1234

### حساب المستخدم (User):
- **البريد:** user.demo@university.edu
- **كلمة المرور:** user1234

---

## 🛠️ أوامر مفيدة

```powershell
# تشغيل الاختبارات
npm test

# فحص الأخطاء
npm run lint

# إصلاح الأخطاء تلقائياً
npm run lint:fix

# تنسيق الكود
npm run format

# فحص الـ Syntax فقط
npm run check
```

---

## 🐛 حل المشاكل الشائعة

### المشكلة: "Cannot find module"
**الحل:**
```powershell
rm -Recurse -Force node_modules
npm install
```

### المشكلة: "Port 3000 is already in use"
**الحل:**
```powershell
# إيقاف البرنامج على المنفذ 3000
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force

# أو تغيير المنفذ في ملف .env:
# PORT=3001
```

### المشكلة: "JWT_SECRET is required"
**الحل:** تأكد من وجود ملف `.env` مع `JWT_SECRET` (راجع الخطوة 3)

---

## 📚 مستندات إضافية

- **README.md** - نظرة عامة على المشروع
- **UPGRADE_GUIDE.md** - دليل الترقية من v1.0 إلى v2.0
- **TROUBLESHOOTING.md** - حلول مفصلة للمشاكل
- **QUICKSTART.md** - دليل البداية السريع (إنجليزي)

---

## 📞 المساعدة

إذا واجهت مشاكل:
1. تحقق من ملف **TROUBLESHOOTING.md**
2. تأكد من أن Node.js الإصدار 18 أو أعلى
3. تأكد من وجود ملف `.env` صحيح
4. تأكد من عدم وجود برنامج آخر على المنفذ 3000

---

**آخر تحديث:** 2024
**الإصدار:** 2.0.0
