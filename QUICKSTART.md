# 🎯 خطوات التثبيت والتشغيل السريع

## المتطلبات الأساسية
- Node.js 18+ 
- npm 9+
- Git

## خطوة بخطوة

### 1️⃣ استنساخ المشروع
```powershell
git clone <your-repo-url>
cd gatelaunch
```

### 2️⃣ تثبيت المكتبات
```powershell
# حذف node_modules القديمة (اختياري)
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue

# تثبيت جميع المكتبات
npm install
```

### 3️⃣ إعداد ملف .env
```powershell
# نسخ الملف النموذجي
Copy-Item .env.example .env

# افتح الملف وعدّل القيم
notepad .env
```

**القيم المهمة في .env:**
```env
NODE_ENV=development
PORT=3000
JWT_SECRET=your-random-secret-key-here-change-in-production
REDIS_ENABLED=false
WEBSOCKET_ENABLED=true
```

### 4️⃣ تشغيل التطبيق

**وضع التطوير (مع Hot Reload):**
```powershell
npm run vendor:fetch
npm run dev
```

**أو الوضع العادي:**
```powershell
npm run vendor:fetch
npm run build
npm start
```

### 5️⃣ اختبار التشغيل

افتح المتصفح واذهب إلى:
- الصفحة الرئيسية: http://localhost:3000
- لوحة التحكم: http://localhost:3000/dashboard
- صفحة الإدارة: http://localhost:3000/admin
- API Health Check: http://localhost:3000/api/health

---

## 🧪 الاختبارات

```powershell
# تشغيل جميع الاختبارات
npm test

# تشغيل مع التغطية
npm test -- --coverage

# تشغيل في وضع المراقبة
npm run test:watch
```

---

## 🐳 باستخدام Docker (متقدم)

### التثبيت الأول
```powershell
# بناء الصورة
docker build -t gatelaunch:latest .

# تشغيل الحاوية
docker run -d -p 3000:3000 --name gatelaunch-app gatelaunch:latest
```

### أو باستخدام Docker Compose
```powershell
# تشغيل جميع الخدمات (App + Redis)
docker-compose up -d

# عرض السجلات
docker-compose logs -f

# إيقاف الخدمات
docker-compose down
```

---

## 📝 نصائح مهمة

### إذا واجهت مشاكل في التثبيت:

**مشكلة: better-sqlite3 لا يعمل**
```powershell
# إعادة بناء المكتبة
npm rebuild better-sqlite3
```

**مشكلة: الملفات محجوبة (Execution Policy)**
```powershell
# تعطيل الحجب مؤقتاً
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
npm run dev
```

**مشكلة: المنفذ 3000 مستخدم**
```powershell
# تغيير المنفذ في .env
PORT=3001
```

---

## 🔍 التحقق من التثبيت الصحيح

```powershell
# التحقق من النسخة
node --version    # يجب أن تكون 18+
npm --version     # يجب أن تكون 9+

# التحقق من المكتبات المثبتة
npm list --depth=0

# فحص الأمان
npm audit

# إصلاح الثغرات تلقائياً
npm audit fix
```

---

## 🎓 الخطوات التالية

1. ✅ تسجيل حساب جديد من `/signup`
2. ✅ تسجيل الدخول
3. ✅ استكشاف لوحة التحكم
4. ✅ تجربة APIs من `/api`
5. ✅ قراءة [UPGRADE_GUIDE.md](UPGRADE_GUIDE.md) للتفاصيل

---

## 💡 أوامر مفيدة

```powershell
# تشغيل التطبيق
npm start              # إنتاج
npm run dev            # تطوير

# الجودة
npm run lint           # فحص الكود
npm run format         # تنسيق الكود

# الاختبار
npm test               # الاختبارات
npm run test:watch     # مراقبة

# Docker
docker-compose up -d   # تشغيل
docker-compose logs    # السجلات
docker-compose down    # إيقاف
```

---

## ❓ الدعم

إذا واجهت أي مشكلة:
1. تحقق من ملف [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. ابحث في [Issues](https://github.com/your-repo/issues)
3. افتح Issue جديد
4. راسلنا على support@gatelaunch.com

---

**🚀 الآن أنت جاهز للبدء!**
