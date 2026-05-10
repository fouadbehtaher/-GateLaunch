# 🐛 حل المشاكل الشائعة

## مشاكل التثبيت

### ❌ خطأ: `better-sqlite3` لا يعمل

**الأعراض:**
```
Error: Cannot find module 'better-sqlite3'
```

**الحل:**
```powershell
# إعادة بناء المكتبة
npm rebuild better-sqlite3

# أو إعادة التثبيت الكامل
npm uninstall better-sqlite3
npm install better-sqlite3
```

**إذا استمرت المشكلة:**
```powershell
# تثبيت أدوات البناء
npm install --global windows-build-tools
npm install better-sqlite3
```

---

### ❌ خطأ: `EACCES` أو `permission denied`

**الأعراض:**
```
Error: EACCES: permission denied
```

**الحل:**
```powershell
# تشغيل PowerShell كـ Administrator
# ثم
npm cache clean --force
npm install
```

---

### ❌ خطأ: `Execution Policy`

**الأعراض:**
```
Scripts cannot be loaded because running scripts is disabled on this system
```

**الحل:**
```powershell
# مؤقتاً (للجلسة الحالية)
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process

# أو بشكل دائم (كـ Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned
```

---

## مشاكل التشغيل

### ❌ خطأ: المنفذ مستخدم

**الأعراض:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**الحل 1 - تغيير المنفذ:**
```env
# في ملف .env
PORT=3001
```

**الحل 2 - إيقاف العملية المستخدمة للمنفذ:**
```powershell
# معرفة العملية
netstat -ano | findstr :3000

# إيقاف العملية (استبدل PID بالرقم الظاهر)
taskkill /PID <PID> /F
```

---

### ❌ خطأ: `.env` غير موجود

**الأعراض:**
```
Warning: Environment variables not loaded
```

**الحل:**
```powershell
# نسخ الملف النموذجي
Copy-Item .env.example .env

# تعديل القيم
notepad .env
```

---

### ❌ خطأ: قاعدة البيانات

**الأعراض:**
```
Error: SQLITE_ERROR: no such table
```

**الحل:**
```powershell
# حذف قاعدة البيانات القديمة
Remove-Item storage/gatelaunch.db -ErrorAction SilentlyContinue

# إعادة التشغيل (سيتم إنشاء جداول جديدة)
npm start
```

---

## مشاكل Redis

### ❌ خطأ: Redis connection failed

**الأعراض:**
```
Redis connection error: connect ECONNREFUSED
```

**الحل 1 - تعطيل Redis:**
```env
# في ملف .env
REDIS_ENABLED=false
```

**الحل 2 - تثبيت Redis:**

**على Windows:**
```powershell
# استخدم WSL أو Docker
docker run -d -p 6379:6379 redis:alpine
```

**على Linux/Mac:**
```bash
# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis

# macOS
brew install redis
brew services start redis
```

---

## مشاكل WebSocket

### ❌ خطأ: WebSocket connection failed

**الأعراض:**
```
WebSocket connection failed: Error during WebSocket handshake
```

**الحل:**
```javascript
// تأكد من إرسال التوكن الصحيح
const token = 'your-jwt-token';
const ws = new WebSocket(`ws://localhost:3000/ws?token=${token}`);
```

**إذا استمرت المشكلة:**
```env
# تعطيل WebSocket مؤقتاً
WEBSOCKET_ENABLED=false
```

---

## مشاكل JWT

### ❌ خطأ: Token expired

**الأعراض:**
```json
{
  "success": false,
  "message": "Token expired"
}
```

**الحل:**
```javascript
// استخدم refresh token للحصول على access token جديد
const response = await fetch('/api/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken: yourRefreshToken })
});
```

---

### ❌ خطأ: Invalid token

**الأعراض:**
```json
{
  "success": false,
  "message": "Invalid token"
}
```

**الحل:**
```javascript
// تأكد من إرسال التوكن في الـ Header الصحيح
fetch('/api/endpoint', {
  headers: {
    'Authorization': 'Bearer ' + accessToken
  }
});
```

---

## مشاكل Docker

### ❌ خطأ: Docker build failed

**الأعراض:**
```
ERROR: failed to solve
```

**الحل:**
```powershell
# تنظيف Docker cache
docker system prune -a

# إعادة البناء
docker build --no-cache -t gatelaunch:latest .
```

---

### ❌ خطأ: Container exits immediately

**الأعراض:**
الحاوية تتوقف مباشرة بعد التشغيل

**الحل:**
```powershell
# عرض السجلات
docker logs <container-id>

# التحقق من المتغيرات البيئية
docker-compose config
```

---

## مشاكل الأداء

### 🐌 التطبيق بطيء

**الحلول:**

1. **تفعيل Redis:**
```env
REDIS_ENABLED=true
```

2. **تقليل Logging في الإنتاج:**
```env
LOG_LEVEL=warn
```

3. **تفعيل Compression:**
```javascript
// في src/app.js
app.use(compression());
```

---

### 📈 استهلاك ذاكرة عالي

**الحلول:**

1. **تنظيف Cache دورياً:**
```javascript
// يحدث تلقائياً كل 5 دقائق
```

2. **تقليل حجم Logs:**
```env
LOG_MAX_FILES=7
LOG_MAX_SIZE=10m
```

3. **مراقبة الذاكرة:**
```powershell
# عرض استهلاك الموارد
docker stats
```

---

## مشاكل الأمان

### 🔐 خطأ: CORS

**الأعراض:**
```
Access to fetch has been blocked by CORS policy
```

**الحل:**
```env
# في .env
ALLOWED_ORIGINS=https://your-domain.com,https://another-domain.com
```

---

### 🔑 خطأ: JWT Secret

**الأعراض:**
```
Error: JWT_SECRET is required
```

**الحل:**
```env
# في .env
JWT_SECRET=generate-a-random-secret-key-here
```

**توليد Secret آمن:**
```powershell
# PowerShell
[System.Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

---

## أدوات التشخيص

### فحص الحالة العامة

```powershell
# Health Check
curl http://localhost:3000/api/health

# عرض السجلات
Get-Content logs/combined.log -Tail 50

# عرض الأخطاء فقط
Get-Content logs/error.log -Tail 20
```

---

### فحص قاعدة البيانات

```powershell
# الاتصال بـ SQLite
sqlite3 storage/gatelaunch.db

# عرض الجداول
.tables

# عرض المستخدمين
SELECT * FROM users;

# الخروج
.quit
```

---

### فحص Redis

```powershell
# الاتصال بـ Redis
redis-cli

# عرض جميع المفاتيح
KEYS *

# عرض قيمة معينة
GET user:123

# الخروج
exit
```

---

## الحصول على مساعدة إضافية

إذا لم تحل المشكلة:

1. **ابحث في Issues:**
   https://github.com/your-repo/issues

2. **افتح Issue جديد:**
   - اشرح المشكلة بالتفصيل
   - أرفق السجلات (logs)
   - حدد نظام التشغيل والنسخة

3. **اتصل بنا:**
   - Email: support@gatelaunch.com
   - Discord: [انضم للخادم]
   - Twitter: @GateLaunch

---

## قائمة التحقق السريعة ✅

قبل طلب المساعدة، تأكد من:

- [ ] Node.js 18+ مثبت
- [ ] npm install تم تشغيله
- [ ] ملف .env موجود ومعبأ
- [ ] المنفذ 3000 غير مستخدم
- [ ] لا توجد أخطاء في logs/error.log
- [ ] تم تجربة إعادة التشغيل
- [ ] تم تنظيف node_modules وإعادة التثبيت

---

**💡 نصيحة:** احتفظ بهذا الملف مفتوحاً أثناء التطوير!
