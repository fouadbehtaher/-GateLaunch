# ⚡ الأوامر السريعة - GateLaunch v2.0

## 📦 التثبيت

```powershell
# تثبيت المكتبات
npm install

# ØªÙ†Ø²ÙŠÙ„ Ù…ÙƒØªØ¨Ø§Øª Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© Ù…Ø­Ù„ÙŠÙ‹Ø§ (Notyf + Lucide)
npm run vendor:fetch

# إعداد البيئة
Copy-Item .env.example .env
```

---

## 🚀 التشغيل

```powershell
# تطوير (Hot Reload)
npm run dev

# (Ø§Ø®ØªÙŠØ§Ø±ÙŠ/Production) Ø¨Ù†Ø§Ø¡ dist (minify + hashing)
npm run build

# إنتاج
npm start

# فحص الكود
npm run check
```

---

## 🧪 الاختبارات

```powershell
# تشغيل الاختبارات
npm test

# مع التغطية
npm test -- --coverage

# وضع المراقبة
npm run test:watch

# اختبار محدد
npm test -- auth.test.js
```

---

## 🎨 جودة الكود

```powershell
# فحص ESLint
npm run lint

# إصلاح تلقائي
npm run lint:fix

# تنسيق Prettier
npm run format

npm run format:check
```

---

## 🐳 Docker

```powershell
# بناء الصورة
docker build -t gatelaunch:latest .

# تشغيل حاوية
docker run -d -p 3000:3000 --name gatelaunch-app gatelaunch:latest

# Docker Compose (مع Redis)
docker-compose up -d        # تشغيل
docker-compose logs -f      # السجلات
docker-compose ps           # الحالة
docker-compose down         # إيقاف

# تنظيف
docker system prune -a

# Docker tools (format/lint) on demand
docker compose --profile tools run --rm tools              # npm run format
docker compose --profile tools run --rm tools npm run lint:fix
docker compose --profile tools run --rm tools npm run format:check
```

---

## 🔍 التشخيص

```powershell
# Health Check
curl http://localhost:3000/api/health

# عرض السجلات
Get-Content logs/combined.log -Tail 50
Get-Content logs/error.log -Tail 20

# مراقبة مباشرة
Get-Content logs/combined.log -Wait

# فحص المكتبات
npm list --depth=0
npm audit
npm audit fix
```

---

## 🗄️ قاعدة البيانات

```powershell
# SQLite
sqlite3 storage/gatelaunch.db

# أوامر SQLite
.tables                    # عرض الجداول
.schema users             # عرض بنية جدول
SELECT * FROM users;      # استعلام
.quit                     # خروج

# حذف قاعدة البيانات
Remove-Item storage/gatelaunch.db
```

---

## 📊 Redis

```powershell
# تشغيل Redis (Docker)
docker run -d -p 6379:6379 redis:alpine

# الاتصال
redis-cli

# أوامر Redis
KEYS *                    # جميع المفاتيح
GET user:123             # قيمة معينة
DEL user:123             # حذف
FLUSHALL                 # حذف الكل
exit                     # خروج
```

---

## 🌐 API Testing

```powershell
# باستخدام curl

# Health Check
curl http://localhost:3000/api/health

# تسجيل حساب
curl -X POST http://localhost:3000/api/auth/signup `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","password":"Test1234567890","name":"Test User"}'

# تسجيل دخول
curl -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","password":"Test1234567890"}'

# الحصول على Profile (استبدل TOKEN)
curl http://localhost:3000/api/auth/profile `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# قائمة الطلبات
curl http://localhost:3000/api/orders `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Dashboard Analytics
curl http://localhost:3000/api/analytics/dashboard `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🔧 الصيانة

```powershell
# تنظيف node_modules
Remove-Item -Recurse -Force node_modules
npm install

# تنظيف Cache
npm cache clean --force

# تحديث المكتبات
npm update

# فحص الثغرات
npm audit
npm audit fix --force

# إعادة بناء native modules
npm rebuild

# إعادة تثبيت كل شيء
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```

---

## 📝 Git

```powershell
# التهيئة الأولى
git init
git add .
git commit -m "Initial commit - GateLaunch v2.0"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main

# التحديثات
git status
git add .
git commit -m "Your message"
git push

# فروع جديدة
git checkout -b feature/new-feature
git push -u origin feature/new-feature
```

---

## 🚢 النشر

```powershell
# Linux/Mac
chmod +x deploy.sh
./deploy.sh production

# Windows
.\deploy.ps1 -Environment production

# يدوياً
git pull origin main
  npm install
  npm run vendor:fetch
  npm run build
  npm prune --production
  npm start
```

---

## ⚙️ المتغيرات البيئية المهمة

```env
# الأساسي
NODE_ENV=production
PORT=3000

# المصادقة
JWT_SECRET=your-secret-key

# Redis (اختياري)
REDIS_ENABLED=true
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# WebSocket
WEBSOCKET_ENABLED=true

# السجلات
LOG_LEVEL=info

# التكاملات (اختياري)
TELEGRAM_BOT_TOKEN=
SLACK_WEBHOOK_URL=
N8N_WEBHOOK_URL=
```

---

## 🔗 روابط مفيدة

```
الصفحة الرئيسية:        http://localhost:3000
لوحة التحكم:            http://localhost:3000/dashboard
صفحة الإدارة:           http://localhost:3000/admin
وثائق API:              http://localhost:3000/api
فحص الصحة:              http://localhost:3000/api/health
WebSocket:               ws://localhost:3000/ws?token=YOUR_TOKEN
```

---

## 📚 وثائق

```
START_HERE.md          - ابدأ من هنا
QUICKSTART.md          - البدء السريع
README.md              - الدليل الرئيسي
UPGRADE_GUIDE.md       - دليل الترقية
TROUBLESHOOTING.md     - حل المشاكل
CONTRIBUTING.md        - المساهمة
SECURITY.md            - الأمان
```

---

## 🆘 الدعم السريع

```
🐛 مشاكل؟          → TROUBLESHOOTING.md
❓ أسئلة؟          → support@gatelaunch.com
💬 نقاش؟           → Discord Server
🐦 تحديثات؟        → @GateLaunch
⭐ أعجبك؟          → نجمة على GitHub
```

---

## 🎯 سير العمل المقترح

```
1. npm install                    ✓ تثبيت
2. Copy-Item .env.example .env    ✓ إعداد
3. npm run dev                    ✓ تشغيل
4. افتح http://localhost:3000     ✓ اختبار
5. npm test                       ✓ فحص
6. git commit                     ✓ حفظ
7. docker-compose up -d           ✓ نشر (اختياري)
```

---

<div align="center">

**⚡ الأوامر الأكثر استخداماً:**

```powershell
npm run dev              # تطوير
npm test                 # اختبار
npm run lint             # فحص
docker-compose up -d     # نشر
```

**📖 اقرأ:** [START_HERE.md](START_HERE.md) **للبدء**

</div>
