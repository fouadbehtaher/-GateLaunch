# 🎯 التشغيل في 3 خطوات

## 1️⃣ التثبيت
```powershell
npm install
```

## 2️⃣ الإعداد  
```powershell
Copy-Item .env.example .env
# عدّل JWT_SECRET في الملف .env
```

## 3️⃣ التشغيل
```powershell
npm run dev
```

**✅ افتح:** http://localhost:3000

---

## 📚 اقرأ بعد ذلك

1. [START_HERE.md](START_HERE.md) - دليل البداية الشامل
2. [COMMANDS.md](COMMANDS.md) - جميع الأوامر المفيدة
3. [README.md](README.md) - الوثائق الكاملة

---

## 💡 نصيحة سريعة

لأفضل أداء:
```env
# في .env
REDIS_ENABLED=true
```

ثم شغّل Redis:
```powershell
docker run -d -p 6379:6379 redis:alpine
```

---

**🚀 هذا كل شيء! ابدأ الآن!**
