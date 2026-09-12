# FitBoom

**FitBoom** — O'zbekiston sport zallari uchun zamonaviy raqamli platforma. Foydalanuvchilar yagona kredit (kalit) tizimi orqali shaharning turli sport zallariga kira oladi, vaqt bron qiladi, va online video darsliklarni tomosha qiladi.

---

## Loyiha haqida

FitBoom sport hayotini boshqarishni soddalashtiradi. Telefon raqami va Telegram bot orqali ro'yxatdan o'tiladi, keyin kalitlar sotib olinib, ixtiyoriy zal bron qilinadi. Zal eshigida QR-kod skanerlash orqali kirish amalga oshiriladi.

---

## Asosiy imkoniyatlar

### Foydalanuvchi uchun

**Kirish va ro'yxatdan o'tish**
- Telegram bot orqali kirish (telefon raqami ulashish)
- Bir martalik login-kod tizimi (5 daqiqa amal qiladi)
- Profil to'ldirish: ism, yosh, jins, profil rasmi
- Brute-force himoyasi (3 ta noto'g'ri urinishdan keyin 5 daqiqa blok)

**Kalit (kredit) tizimi**
- Kalitlar — zallarga kirish uchun universal valyuta
- 3 ta paket mavjud: 6, 13, 24 kalit
- Kalitlarning muddati (30 kun) mavjud, muddat tugashiga 5 kun qolganda ogohlantirish
- Qisman to'lov qo'llab-quvvatlanadi (admin summani o'zgartirishi mumkin)

**To'lov tizimi**
- Kartaga o'tkazish: karta raqamiga pul o'tkazib, chek (rasm) yuboriladi
- Admin Telegram bot orqali chekni ko'rib, tasdiqlaydi yoki rad etadi
- Tasdiq bo'lganda foydalanuvchiga Telegram orqali xabar va elektron fiskal chek (PDF) yuboriladi
- Click va Payme integratsiyasi (tez kunda)

**Sport zallar**
- Joylashuvga yaqin zallar ro'yxati (GPS masofasi bo'yicha saralangan)
- Har bir zal uchun: rasm galereyasi, narx, manzil, ish vaqti, imkoniyatlar, kategoriyalar
- Zal tafsilotlari: tavsif, qulay imkoniyatlar (dush, to'xtash joyi va hokazo)
- Kategoriya bo'yicha filtrlash (fitnes, suzish, yoga va hokazo)
- Qidiruv va narx bo'yicha filtrlash
- Google Maps da ko'rish

**Bron qilish tizimi**
- Vaqt slotlarini tanlash (har bir zal uchun kunlik jadval)
- Bron yaratish — kalit avtomatik hisobdan chiqariladi
- Bron bekor qilish — kalit qaytariladi
- Bronlar tarixi (tashrif buyurilgan, o'tkazib yuborilgan)
- Faol bron uchun QR-kod generatsiyasi

**QR-kod skanerlash**
- Zal QR-kodini skanerlash orqali kirish tasdiqlash
- Erta kelish holati uchun sanash (necha daqiqa qolganligi)
- Muvaffaqiyatli kirishda animatsiya

**Video darsliklar**
- Kategoriya bo'yicha tematik to'plamlar
- Har bir to'plam: muqova, videolar soni, narx yoki bepul
- Sotib olingan to'plamlarni to'liq ko'rish
- Video pleer (sahifada ko'rish)

**Harita**
- Interaktiv Leaflet xarita
- GPS orqali foydalanuvchi joylashuvi
- Zal markerlarini bosib bron qilish
- Google Maps ga o'tish tugmasi

**Ko'p tillilik**
- O'zbek tili (asosiy)
- Rus tili
- Ingliz tili
- Til tanlash — qurilmada saqlanadi

---

### Admin uchun

**Telegram bot admin paneli**
- `/admin` buyrug'i orqali Telegram da kirish
- Kutilayotgan to'lovlar ro'yxatini ko'rish
- To'lovlarni **Tasdiqlash** / **Rad etish** tugmalari bilan boshqarish
- To'lov summasini o'zgartirish (qisman to'lov)
- Barcha foydalanuvchilarga reklama xabari yuborish (broadcast)
- Tasdiqlanganda foydalanuvchiga fiskal chek PDF avtomatik yuboriladi

**Web admin paneli**
- Umumiy statistika: foydalanuvchilar soni, bronlar, daromad
- **Zalllar boshqaruvi**: qo'shish, tahrirlash, o'chirish, rasm yuklash, QR-kod yaratish, vaqt slotlari sozlash
- **Foydalanuvchilar boshqaruvi**: ro'yxat, kredit qo'shish/ayirish, admin huquqi berish
- **To'plamlar boshqaruvi**: video to'plamlar, videolar qo'shish, narx belgilash
- **Hamkorlik so'rovlari**: zal qo'shish uchun kelgan so'rovlarni ko'rish

**Zal egasi paneli**
- Maxsus kirish kodi orqali kirish
- Bugungi va umumiy tashrif statistikasi
- Tashrif buyuruvchilar ro'yxati (ism, rasm, vaqt, kalit soni)
- Jami daromad va qarz hisobi
- To'lov tarixi

---

## Texnik tarkib

### Frontend
- **React 18** + **TypeScript**
- **Vite** (build tooling)
- **Tailwind CSS** + **shadcn/ui** (dizayn tizimi)
- **TanStack Query v5** (server holat boshqaruvi)
- **Wouter** (routing)
- **React Hook Form** + **Zod** (forma validatsiyasi)
- **Recharts** (grafiklar)
- **Leaflet** / **React-Leaflet** (xarita)
- **Framer Motion** (animatsiyalar)
- **Lucide React** + **React Icons** (ikonkalar)
- **Capacitor** (Android mobil ilova)

### Backend
- **Node.js** + **Express**
- **TypeScript** + **tsx**
- **Passport.js** (session autentifikatsiya)
- **Multer** (fayl yuklash)
- **Bcrypt** (parol shifrlash)
- **Stripe** (to'lov integratsiyasi)
- **PDFKit** (elektron chek generatsiyasi)
- **QRCode** (QR-kod yaratish)

### Ma'lumotlar bazasi
- **PostgreSQL** (Neon serverless)
- **Drizzle ORM** + **Drizzle-Kit**
- **Drizzle-Zod** (schema validatsiya)

### Integratsiyalar
- **Telegram Bot API** — login, to'lov tasdiqlash, xabar yuborish, PDF chek
- **Replit Object Storage** — rasm va chek fayllari saqlash
- **Stripe** — karta to'lovi (ixtiyoriy)
- **Google Maps** (tashqi havola)

---

## Ma'lumotlar bazasi strukturasi

| Jadval | Tavsif |
|---|---|
| `users` | Foydalanuvchilar (Telegram ID, telefon, kalit, muddat) |
| `gyms` | Sport zallar (nom, manzil, koordinat, narx, rasm) |
| `bookings` | Bronlar (foydalanuvchi, zal, vaqt, QR-kod, holat) |
| `time_slots` | Zal vaqt slotlari (hafta kuni, boshlanish/tugash, sig'im) |
| `gym_visits` | Zal tashriflari tarixi |
| `gym_payments` | Zal egasiga to'lovlar |
| `credit_payments` | Kredit to'lov so'rovlari (chek, holat, qoldiq) |
| `online_classes` | Video darslar |
| `video_collections` | Video to'plamlar |
| `user_purchases` | Foydalanuvchi sotib olgan to'plamlar |
| `login_codes` | Telegram login kodlari (bir martalik) |
| `admin_settings` | Admin sozlamalari (karta raqami va hokazo) |
| `partnership_messages` | Hamkorlik so'rovlari |

---

## O'rnatish va ishga tushirish

### Talablar
- Node.js 20+
- PostgreSQL ma'lumotlar bazasi
- Telegram bot tokeni ([@BotFather](https://t.me/BotFather))

### Muhit o'zgaruvchilari

To'liq ro'yxat va izohlar: **`.env.example`**. Sirlar hech qachon repozitoriyga
commit qilinmaydi — ular Replit Secrets panelida saqlanadi.

```env
# Majburiy — bularsiz server ishga tushmaydi
DATABASE_URL=postgresql://...
SESSION_SECRET=...               # openssl rand -base64 32
JWT_SECRET=...                   # openssl rand -base64 48

# Muhim
ADMIN_PASSWORD=...               # admin paneliga birinchi kirish (min 10 belgi)
TELEGRAM_BOT_TOKEN=123456789:AAF...
ADMIN_IDS=123456789,987654321    # admin huquqining yagona manbai
TELEGRAM_WEBHOOK_SECRET=...      # berilmasa SESSION_SECRET dan hosil qilinadi

# Ixtiyoriy
QR_SECRET=...                    # berilmasa SESSION_SECRET ishlatiladi
DEVSMS_API_KEY=...               # SMS OTP
ALLOWED_ORIGINS=https://fitboom.uz
```

> **`ADMIN_IDS` haqida:** admin huquqi shu ro'yxat asosida beriladi. Ro'yxatdagi
> Telegram ID bilan kirgan foydalanuvchiga `is_admin` avtomatik beriladi,
> ro'yxatdan chiqarilganda esa olib tashlanadi.

### Xavfsizlik qoidalari

Loyihada pul (kalit) aylanadi. Quyidagilar buzilmasligi kerak:

- **Kalit faqat tasdiqlangan to'lovdan keyin qo'shiladi** — chek yuklanadi,
  admin Telegram'da tasdiqlaydi. Kalit qo'shadigan yangi endpoint qo'shishdan
  oldin yaxshilab o'ylang.
- **Kalit va joy hisob-kitobi atomik** — `spendUserCredits`, `refundUserCredits`,
  `reserveTimeSlotSpot`, `releaseTimeSlotSpot` metodlaridan foydalaning.
  `o'qish → hisoblash → yozish` naqshi double-spend'ga olib keladi.
- **Zal QR kodi HMAC bilan imzolangan** (`server/qrSignature.ts`) — tekshiruvda
  `isAuthenticGymQr()` ni chetlab o'tmang.
- **`qrCode` va `ownerAccessCode` javobga tushmaydi** — `publicGym()` dan
  foydalaning.
- **Har bir yozuv endpointi huquq tekshiruvidan o'tadi** — `requireAdmin`,
  `requireGymManager` yoki `requireGymOwner`.

### Ishga tushirish

```bash
# Paketlarni o'rnatish
npm install

# Ma'lumotlar bazasini sozlash
npm run db:push

# Ishlab chiqish rejimi
npm run dev

# Sifat tekshiruvlari
npm run check     # TypeScript (0 xato bo'lishi kerak)
npm test          # Vitest testlari

# Production build
npm run build
npm start
```

CI (`.github/workflows/ci.yml`) har bir push va PR da yuqoridagi uchta
tekshiruvni avtomatik ishga tushiradi.

---

## Asosiy oqimlar

### Foydalanuvchi kirish oqimi
```
Telegram bot /start → telefon ulashish → login kodi olish → 
veb saytda kodni kiritish → profilni to'ldirish → asosiy sahifa
```

### Kalit sotib olish oqimi
```
"To'ldirish" tugmasi → to'lov usulini tanlash → 
"Kartaga o'tkazish" → paket tanlash → karta raqamiga pul o'tkazish → 
chek rasmini yuklash → admin Telegram da tasdiqlaydi → 
kalit hisobga qo'shiladi + PDF chek Telegram da yuboriladi
```

### Zal bron qilish oqimi
```
Zallar ro'yxati → zal tanlash → sana va vaqt sloti tanlash → 
bron yaratish (kalit hisobdan chiqadi) → QR-kod generatsiya → 
zal QR-kodini skanerlash → kirish tasdiqlanadi
```

---

## Loyiha tuzilishi

```
├── client/                 # React frontend
│   └── src/
│       ├── components/     # UI komponentlar
│       ├── pages/          # Sahifalar
│       ├── contexts/       # Auth, Language kontekstlar
│       └── lib/            # Utility funksiyalar
├── server/                 # Express backend
│   ├── routes.ts           # API yo'nalishlari
│   ├── storage.ts          # Ma'lumotlar bazasi operatsiyalari
│   ├── auth.ts             # Autentifikatsiya
│   ├── telegram.ts         # Telegram bot logikasi
│   └── pdfReceipt.ts       # Fiskal chek generatsiyasi
├── shared/
│   └── schema.ts           # Drizzle ORM sxemasi va tiplari
├── android/                # Capacitor Android loyihasi
└── migrations/             # SQL migratsiyalar
```

---

## Litsenziya

MIT
