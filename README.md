# ⚡ SunkenBot — دليل النشر الكامل

## هيكل المشروع

```
Sunken-main/
├── index.js              ← منطق البوت الرئيسي
├── start.js              ← نقطة الإطلاق (Bot + Dashboard معاً)
├── config.json           ← إعدادات البوت (prefix, admins...)
├── appstate.json         ← جلسة البوت الأول (لا ترفعها لـ GitHub)
├── commands/             ← أوامر البوت
├── cache/                ← ملفات مؤقتة (sing, ytdl, tiktok...)
├── dashboard/
│   ├── server.js         ← خادم Express للوحة التحكم (CommonJS)
│   ├── public/
│   │   └── index.html    ← واجهة لوحة التحكم (Tailwind CDN)
│   └── data/
│       ├── disabled-groups.json  ← المجموعات المعطّلة
│       ├── groups-cache.json     ← قائمة المجموعات المخزّنة
│       ├── outbox.json           ← رسائل الداشبورد المنتظرة الإرسال
│       └── sessions-meta.json    ← ملاحظات الجلسات
└── utils/
    └── mediahelper.js
```

## النشر على Render

### متغيرات البيئة المطلوبة

| المتغير | الوصف |
|---------|-------|
| `APPSTATE` أو `APPSTATE_BOT1` | جلسة فيسبوك للبوت الأول |
| `PORT` | 10000 (Render يضبطه تلقائياً) |
| `MONGO_URI` | اختياري — لقاعدة بيانات MongoDB |
| `FERDEV_API_KEY` | مفتاح Ferdev API (للموسيقى) |
| `DEBUG_MEDIA` | `true` لتفعيل logs التفصيلية |
| `RENDER_EXTERNAL_URL` | رابط الخدمة (Render يضبطه تلقائياً) |

### Start Command
```
node start.js
```

## لوحة التحكم

بعد النشر، افتح: `https://YOUR-SERVICE.onrender.com`

### الميزات
- 📊 **الحالة** — معلومات البوت، وقت التشغيل، عدد المجموعات
- 🔑 **الجلسات** — رفع AppState للبوت الأول والثاني
- 👥 **المجموعات** — عرض وتفعيل/تعطيل البوت في كل مجموعة
- 📢 **الإذاعة** — إرسال رسالة لمجموعات محددة
- ⚙️ **الأوامر** — تفعيل/تعطيل الأوامر
- 🛠️ **الإعدادات** — تعديل الاسم والـ prefix والمشرفين
- 🌐 **Render API** — ربط متغيرات البيئة مباشرة

### ربط Render API (لرفع AppState من اللوحة)
1. احصل على API Key من: `dashboard.render.com → Account → API Keys`
2. احصل على Service ID من رابط الخدمة: `srv-xxxxxxxxxxxx`
3. أدخلهما في تبويب **Render API** بلوحة التحكم

## تشغيل محلي
```bash
npm install
APPSTATE='[...]' node start.js
```

## ملاحظات مهمة
- **لا ترفع `appstate.json` لـ GitHub** — أضفه لـ `.gitignore`
- مجلد `dashboard/data/` يُنشأ تلقائياً عند أول تشغيل
- البوت يتجاهل الرسائل في المجموعات المعطّلة من لوحة التحكم
- رسائل الإذاعة تُرسل تلقائياً كل 10 ثواني عبر `outbox.json`
