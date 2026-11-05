# مَنَصَّة أَثَـر | Athar Hub v2.0
**Autonomous, Enterprise-Grade Content Curation & Broadcasting Platform for Telegram**

منصة مركزية متكاملة لأتمتة، إدارة، وجدولة نشر المحتوى القرآني الصوتي، روائع الأدب والشعر العربي، ومقتطفات القنوات والحسابات عبر قناتي التلجرام:
- **قناة نَـظَـرَات** (`@natharat06`)
- **قناة نَسَمَات دَعَوِيَّة** (`@nasmat1448`)

---

## 🚀 التقنيات المستخدمة (Core Stack)
- **Framework**: Next.js 15 (App Router, Server Actions, Dynamic Route Handlers, TypeScript)
- **Styling**: Tailwind CSS (Refined Dark Glassmorphism, RTL Arabic typography with Tajawal & Amiri)
- **Icons**: Lucide React
- **ORM & Database**: Prisma ORM with PostgreSQL (مربوطة بقاعدة بيانات سحابية حقيقية على Neon DB)
- **Telegram Bot API**: `sendAudio` لبث التلاوات المباشرة بمشغل صوتي مدمج، و `sendMessage` بتنسيق HTML الثري
- **Scheduling & Crons**: Next.js Edge/Node Route Handler متوافق مع Vercel Cron و Webhooks الخارجية

---

## 📁 هيكلية المشروع (Project Architecture)

```
├── app/
│   ├── api/
│   │   └── cron/
│   │       └── dispatch/
│   │           └── route.ts         # مسار الأتمتة وجدولة النشر الآلي
│   ├── actions.ts                   # خوادم العمليات (Server Actions)
│   ├── globals.css                  # أنماط الزجاج المظلم والخطوط العربية
│   ├── layout.tsx                   # بنية الصفحة وتهيئة RTL والخطوط
│   └── page.tsx                     # الصفحة الرئيسية للوحة التحكم
├── components/
│   ├── AudioPlayerPreview.tsx       # مشغل صوتي تفاعلي أنيق للمقاطع القرآنية
│   ├── PostCard.tsx                 # بطاقة المنشور مع التعديل الفوري والنشر
│   ├── ScheduleSlotRow.tsx          # سطر موعد النشر اليومي والتحكم بالتفعيل
│   ├── SourceCard.tsx               # بطاقة المصدر مع زر السحب الفوري
│   ├── CreatePostModal.tsx          # نافذة صياغة منشور وتوليد تلاوة/شعر
│   ├── AddSourceModal.tsx           # نافذة إضافة مصدر جديد
│   ├── AddScheduleSlotModal.tsx     # نافذة إضافة موعد نشر يومي
│   └── DashboardClient.tsx          # واجهة التحكم الرئيسية والتبويبات
├── lib/
│   ├── ingestion/
│   │   ├── quran.ts                 # محرك جلب التلاوات القرآنية الصوتية المباشرة
│   │   ├── poetry.ts                # موسوعة روائع الشعر العربي والحكم
│   │   ├── telegram.ts              # محرك استخراج محتوى القنوات العامة
│   │   └── twitter.ts               # محرك استخراج تغريدات منصة X / تويتر
│   ├── prisma.ts                    # عميل Prisma Singleton
│   └── telegram.ts                  # محرك إرسال تليجرام (sendAudio / sendMessage)
├── prisma/
│   ├── schema.prisma                # مخطط قاعدة البيانات
│   └── seed.ts                      # بذور البيانات الافتراضية
├── .env                             # متغيرات البيئة الحقيقية
└── .env.example                     # نموذج متغيرات البيئة
```

---

## 🔑 متغيرات البيئة (`.env`)
```env
# Neon PostgreSQL Database Connection
DATABASE_URL="postgresql://username:password@ep-host.aws.neon.tech/neondb?sslmode=require"

# Telegram Bot Token (من @BotFather)
TELEGRAM_BOT_TOKEN="your_bot_token_here"

# القنوات المستهدفة
TELEGRAM_CHANNEL_NATHARAT="@natharat06"
TELEGRAM_CHANNEL_NASMAT="@nasmat1448"

# مفتاح حماية نقطة نهاية الكرون
CRON_SECRET="athar_hub_cron_secret_key"
```

---

## 🛠️ تشغيل المنصة محلياً (Run Locally)

1. **تثبيت الحزم وتوليد بريزما:**
   ```bash
   npm install
   npx prisma generate
   ```

2. **مزامنة قاعدة البيانات (إذا لزم الأمر):**
   ```bash
   npx prisma db push
   ```

3. **تشغيل خادم التطوير:**
   ```bash
   npm run dev
   ```
   افتح المتصفح على: `http://localhost:3000`

---

## ⏰ واجهة الأتمتة والكرون (`/api/cron/dispatch`)
يمكن استدعاء المسار آلياً كل دقيقة أو وفق المواعيد المبرمجة:
```bash
POST /api/cron/dispatch?secret=athar_hub_cron_secret_key
```
- يفحص المواعيد المفعلة التي تطابق التوقيت الحالي (بتوقيت مكة المكرمة).
- يسحب المنشور المعتمد التالي في الطابور ويرسله تلقائياً إلى القناة المحددة.
- في حال كان الطابور فارغاً، يولد المحرك فورياً تلاوة قرآنية خاشعة بصوت كبار القراء أو بيتاً شعرياً بليغاً ويبثه لضمان استمرارية القناة!
