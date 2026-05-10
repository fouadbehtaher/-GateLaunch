# استخدام Node.js 18 Alpine لتقليل حجم الصورة
FROM node:20-alpine

# تثبيت التبعيات الضرورية لـ better-sqlite3
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite

# إنشاء مجلد التطبيق
WORKDIR /app

# نسخ ملفات package.json و package-lock.json
COPY package*.json ./

# تثبيت التبعيات
RUN npm ci --omit=dev

# نسخ باقي ملفات التطبيق
COPY . .

# إنشاء المجلدات المطلوبة
RUN mkdir -p logs storage/backups uploads/proofs_private

# تعيين المتغيرات البيئية
ENV NODE_ENV=production
ENV PORT=3000

# فتح المنفذ
EXPOSE 3000

# تشغيل التطبيق
CMD ["node", "src/app.js"]
