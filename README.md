# GateLaunch v2.0 🚀

<div align="center">

![GateLaunch Logo](assets/logo.png)

**منصة متقدمة لشحن الألعاب والخدمات الرقمية**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-blue.svg)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[English](#english-documentation) | [العربية](#arabic-documentation)

</div>

---

## 📋 جدول المحتويات

- [المميزات](#-المميزات)
- [التقنيات المستخدمة](#-التقنيات-المستخدمة)
- [التثبيت](#-التثبيت)
- [الاستخدام](#-الاستخدام)
- [API Documentation](#-api-documentation)
- [Docker](#-docker)
- [المساهمة](#-المساهمة)
- [الترخيص](#-الترخيص)

---

## ✨ المميزات

### 🔐 نظام مصادقة متقدم
- **JWT Authentication**: توكن آمن مع Refresh Token
- **Session Support**: دعم الجلسات التقليدية للتوافق
- **Role-based Access**: صلاحيات متعددة (Admin, Supervisor, User)
- **Rate Limiting**: حماية من هجمات Brute Force

### ⚡ أداء عالي
- **Redis Caching**: تخزين مؤقت متقدم
- **Memory Fallback**: يعمل بدون Redis
- **Compression**: ضغط الاستجابات (Gzip/Brotli)
- **Database Optimization**: استعلامات محسّنة

### 🔔 إشعارات فورية
- **WebSocket**: اتصال ثنائي الاتجاه
- **Real-time Updates**: تحديثات فورية
- **Multi-channel**: Telegram, Slack, Webhooks
- **Targeted Notifications**: إشعارات موجهة

### 📊 تحليلات وإحصائيات
- **Dashboard Analytics**: لوحة تحليلات شاملة
- **Time Series Data**: رسوم بيانية زمنية
- **User Activity**: تتبع نشاط المستخدمين
- **Performance Metrics**: مقاييس الأداء

### 🛡️ أمان متقدم
- **Helmet.js**: حماية HTTP Headers
- **CORS**: تحكم في الوصول
- **Input Validation**: التحقق من البيانات
- **SQL Injection Protection**: حماية من الحقن

### 📝 سجلات متقدمة
- **Winston Logger**: نظام سجلات احترافي
- **Log Rotation**: تدوير تلقائي
- **Error Tracking**: تتبع الأخطاء
- **Audit Logs**: سجلات المراجعة

### 🐳 DevOps Ready
- **Docker**: صور محسنة
- **Docker Compose**: بيئة متكاملة
- **CI/CD**: GitHub Actions
- **Kubernetes Ready**: جاهز للتوسع

---

## 🛠 التقنيات المستخدمة

### Backend
- **Node.js 18+**: بيئة التشغيل
- **Express.js 4.19**: إطار العمل
- **better-sqlite3**: قاعدة البيانات
- **Redis**: التخزين المؤقت
- **JWT**: المصادقة

### Security
- **Helmet.js**: أمان HTTP
- **bcrypt**: تشفير كلمات المرور
- **CORS**: Cross-Origin Resource Sharing
- **Rate Limiting**: تحديد معدل الطلبات

### Real-time
- **ws**: WebSocket
- **Server-Sent Events**: تحديثات فورية

### Logging & Monitoring
- **Winston**: نظام السجلات
- **Morgan**: HTTP request logger

### Testing
- **Jest**: إطار الاختبار
- **Supertest**: اختبار API

### DevOps
- **Docker**: الحاويات
- **Docker Compose**: إدارة الخدمات
- **GitHub Actions**: CI/CD

---

## 🚀 التثبيت

### المتطلبات
- Node.js 18 أو أعلى
- npm 9 أو أعلى
- Redis (اختياري ولكن مُوصى به)

### خطوات التثبيت

1. **استنساخ المشروع**
```bash
git clone https://github.com/yourusername/gatelaunch.git
cd gatelaunch
```

2. **تثبيت التبعيات**
```bash
npm install
```

3. **إعداد المتغيرات البيئية**
```bash
cp .env.example .env
# قم بتعديل الملف .env حسب احتياجاتك
```

4. **تشغيل التطبيق**

**التطوير:**
```bash
npm run vendor:fetch
npm run dev
```

**الإنتاج:**
```bash
npm run vendor:fetch
npm run build
npm start
```

---

## 💻 الاستخدام

### تشغيل التطبيق

```bash
# تطوير مع Hot Reload
  npm run vendor:fetch
  npm run dev

# إنتاج
  npm run build
  npm start

# اختبارات
npm test

# فحص الكود
npm run lint

# تهيئة الكود
npm run format
```

### الوصول للتطبيق

- **الصفحة الرئيسية**: http://localhost:3000
- **لوحة التحكم**: http://localhost:3000/dashboard
- **صفحة الإدارة**: http://localhost:3000/admin
- **API Documentation**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/api/health

---

## 📚 API Documentation

### Authentication

#### تسجيل حساب جديد
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "StrongPassword123",
  "name": "اسم المستخدم"
}
```

**الاستجابة:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "user",
      "name": "اسم المستخدم"
    },
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

#### تسجيل الدخول
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "StrongPassword123"
}
```

#### الحصول على البيانات الشخصية
```http
GET /api/auth/profile
Authorization: Bearer <access-token>
```

#### تحديث التوكن
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh-token"
}
```

### Orders

#### قائمة الطلبات
```http
GET /api/orders?page=1&limit=10&status=pending
Authorization: Bearer <access-token>
```

#### إنشاء طلب جديد
```http
POST /api/orders
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "game": "PUBG Mobile",
  "playerId": "123456789",
  "amount": 100,
  "wallet": "vodafone_cash",
  "proofUrl": "https://..."
}
```

#### تحديث حالة الطلب (Admin فقط)
```http
PATCH /api/orders/:id
Authorization: Bearer <admin-access-token>
Content-Type: application/json

{
  "status": "approved"
}
```

#### إحصائيات الطلبات
```http
GET /api/orders/stats
Authorization: Bearer <access-token>
```

### Analytics

#### لوحة التحليلات
```http
GET /api/analytics/dashboard
Authorization: Bearer <access-token>
```

#### بيانات زمنية للرسوم البيانية
```http
GET /api/analytics/timeseries?type=orders&period=week
Authorization: Bearer <staff-token>
```

#### أكثر الألعاب طلباً
```http
GET /api/analytics/top-games?limit=10
Authorization: Bearer <staff-token>
```

### WebSocket

#### الاتصال
```javascript
const token = 'your-jwt-access-token';
const ws = new WebSocket(`ws://localhost:3000/ws?token=${token}`);

ws.onopen = () => {
  console.log('Connected to WebSocket');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
  
  // أنواع الرسائل:
  // - connected: تأكيد الاتصال
  // - new_order: طلب جديد
  // - order_updated: تحديث الطلب
  // - notification: إشعار عام
};
```

---

## 🐳 Docker

### بناء الصورة
```bash
docker build -t gatelaunch:latest .
```

### تشغيل الحاوية
```bash
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e JWT_SECRET=your-secret \
  --name gatelaunch \
  gatelaunch:latest
```

### استخدام Docker Compose
```bash
# تشغيل جميع الخدمات
docker-compose up -d

# عرض السجلات
docker-compose logs -f

# إيقاف الخدمات
docker-compose down
```

---

## 🧪 الاختبارات

```bash
# تشغيل جميع الاختبارات
npm test

# تشغيل مع التغطية
npm test -- --coverage

# تشغيل في وضع المراقبة
npm run test:watch

# اختبار ملف محدد
npm test -- auth.test.js
```

---

## 📦 البنية التحتية

```
gatelaunch/
├── src/
│   ├── app.js                    # التطبيق الرئيسي
│   ├── config/
│   │   └── index.js             # الإعدادات
│   ├── middleware/
│   │   ├── auth.js              # المصادقة
│   │   ├── rateLimiter.js       # تحديد المعدل
│   │   └── validator.js         # التحقق
│   ├── routes/
│   │   ├── auth.js              # مسارات المصادقة
│   │   ├── orders.js            # مسارات الطلبات
│   │   └── analytics.js         # مسارات التحليلات
│   ├── services/
│   │   ├── authService.js       # خدمات المصادقة
│   │   ├── orderService.js      # خدمات الطلبات
│   │   └── analyticsService.js  # خدمات التحليلات
│   ├── utils/
│   │   ├── cache.js             # التخزين المؤقت
│   │   ├── helpers.js           # وظائف مساعدة
│   │   ├── jwt.js               # JWT
│   │   └── logger.js            # السجلات
│   └── websocket/
│       └── index.js             # WebSocket
├── __tests__/                    # الاختبارات
├── logs/                         # ملفات السجلات
├── storage/                      # التخزين
├── uploads/                      # الملفات المرفوعة
├── .env.example                  # مثال للمتغيرات
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── package.json
├── README.md
└── UPGRADE_GUIDE.md             # دليل الترقية
```

---

## 🤝 المساهمة

نرحب بمساهماتكم! يرجى اتباع الخطوات التالية:

1. Fork المشروع
2. إنشاء فرع للميزة (`git checkout -b feature/amazing-feature`)
3. Commit التغييرات (`git commit -m 'إضافة ميزة رائعة'`)
4. Push للفرع (`git push origin feature/amazing-feature`)
5. فتح Pull Request

### إرشادات المساهمة
- اتبع معايير الكود الموجودة
- أضف اختبارات للميزات الجديدة
- حدّث الوثائق عند الحاجة
- تأكد من نجاح جميع الاختبارات

---

## 📄 الترخيص

هذا المشروع مرخص بموجب ترخيص MIT - انظر ملف [LICENSE](LICENSE) للتفاصيل.

---

## 👥 الفريق

- **المطور الرئيسي**: [اسمك](https://github.com/yourusername)
- **المساهمون**: [قائمة المساهمين](https://github.com/yourusername/gatelaunch/contributors)

---

## 📞 التواصل

- **الموقع**: https://gatelaunch.com
- **البريد الإلكتروني**: support@gatelaunch.com
- **Twitter**: [@GateLaunch](https://twitter.com/gatelaunch)
- **Discord**: [انضم لخادمنا](https://discord.gg/gatelaunch)

---

## 🙏 شكر وتقدير

- [Express.js](https://expressjs.com/)
- [Node.js](https://nodejs.org/)
- [Redis](https://redis.io/)
- [WebSocket](https://github.com/websockets/ws)
- [Winston](https://github.com/winstonjs/winston)
- وجميع المساهمين في المكتبات مفتوحة المصدر المستخدمة

---

<div align="center">

**صنع بـ ❤️ بواسطة فريق GateLaunch**

⭐ إذا أعجبك المشروع، لا تنسى أن تعطينا نجمة على GitHub!

[⬆ العودة للأعلى](#gatelaunch-v20-)

</div>
