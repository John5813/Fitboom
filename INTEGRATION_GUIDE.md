# FitBoom — Mobile App Integration Guide
> This document is written for AI agents and developers who need to integrate the FitBoom web platform features into the mobile app (Capacitor/React Native).

---

## 1. ARCHITECTURE OVERVIEW

```
Mobile App (Capacitor WebView)
        │
        ▼
https://fitboom.replit.app   ← Production server (Express + React)
        │
        ├── /api/*           ← REST API (JSON)
        ├── /api/telegram/webhook  ← Telegram bot webhook
        └── /                ← SPA (React frontend served from Express)
```

The mobile app connects to the same backend as the web app.
**Base URL:** `https://fitboom.replit.app`

Authentication is **cookie-based session** (Passport.js). The session cookie is set after login and automatically sent with every subsequent request.

---

## 2. MAP FEATURE ("Barchasini ko'rish" — View All Gyms on Map)

### 2.1 How It Works on Web
- The **"Barchasini ko'rish"** link on `HomePage` navigates to the `/map` route using `wouter` router.
- The `/map` route renders `MapPage.tsx` which uses **Leaflet + react-leaflet** to show an interactive OpenStreetMap.
- Map tiles load from: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- Gym data is fetched from `GET /api/gyms` (returns `{ gyms: Gym[] }`).
- Geolocation uses browser's `navigator.geolocation` API.

### 2.2 What Is Required in the Mobile App

#### A. Capacitor Config (`capacitor.config.ts`) — ALREADY SET
```typescript
server: {
  url: 'https://fitboom.replit.app',  // Points to live server
  allowNavigation: [
    '*.tile.openstreetmap.org',       // Allow map tile loading
    '*.openstreetmap.org',
    't.me',
    '*.telegram.org',
  ],
},
plugins: {
  Geolocation: {
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
  },
},
```

#### B. Android Permissions (`android/app/src/main/AndroidManifest.xml`)
Add these lines inside `<manifest>`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

#### C. iOS Permissions (`ios/App/App/Info.plist`)
Add these keys:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>FitBoom uses your location to show nearby gyms on the map.</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>FitBoom uses your location to show nearby gyms on the map.</string>
```

### 2.3 Map API Endpoint

```
GET /api/gyms
Authorization: cookie session (or public if not authenticated)

Response:
{
  "gyms": [
    {
      "id": "uuid",
      "name": "Gym Name",
      "latitude": "41.311151",     ← string, must parseFloat()
      "longitude": "69.279737",   ← string, must parseFloat()
      "imageUrl": "https://...",
      "categories": ["Fitness", "Yoga"],
      "credits": 5,
      "hours": "07:00 - 22:00",
      "address": "Toshkent, ...",
      "description": "...",
      "rating": 5
    }
  ]
}
```

Only gyms where `latitude && longitude && !isNaN(parseFloat(latitude))` should be shown on the map.

### 2.4 Map Page Flow (Frontend)
```
User clicks "Barchasini ko'rish"
  → navigate to /map route (wouter Link)
  → MapPage mounts
  → GET /api/gyms → filter gyms with valid coordinates
  → navigator.geolocation.getCurrentPosition() → center map on user
  → render MapContainer (Leaflet)
  → each gym → Marker with Popup
  → Popup has "Batafsil ko'rish" button → navigate(`/gym/${gym.id}`)
```

### 2.5 Alternative for Native Mobile (if Leaflet fails)
If Leaflet tiles don't load in the app's WebView, use this fallback approach:
```typescript
// Detect Capacitor environment
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  // Open native maps app
  window.open(`geo:${lat},${lng}?q=${encodeURIComponent(gymName)}`, '_system');
  // OR for Google Maps deep link:
  window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_system');
}
```

---

## 3. PAYMENT SYSTEM

FitBoom has **two separate payment flows**:
1. **Manual Bank Transfer** — for purchasing gym credits (keys) — PRIMARY
2. **Stripe** — for purchasing online video course collections — SECONDARY

---

### 3.1 Manual Payment Flow (Credits / Keys)

This is the main payment system. Users pay via bank card transfer, upload receipt, admin verifies via Telegram bot.

#### Full Flow Diagram:
```
User clicks "Kredit sotib olish"
  → PurchaseCreditsDialog opens (shows credit packages)
  → PaymentMethodDialog checks Telegram link status
       GET /api/check-telegram-linked
       Response: { linked: boolean, botUrl: string }

  [If NOT linked]
  → Show "Telegram botga uling" screen
  → User clicks "Botga o'tish" → window.open(botUrl, '_blank')
       botUrl = "https://t.me/uzfitboom_bot?start=auth"
  → Bot sends 6-digit code to user's Telegram chat
  → User enters code in app
  → POST /api/telegram/link-account  { code: "123456" }
  → Account linked ✓

  [If linked]
  → PurchaseCreditsDialog shows:
       - Card number: 9860160104562378
       - Card holder: Javlonbek Mo'ydinov
       - Amount to transfer
  → User transfers money, takes photo of receipt
  → User uploads receipt photo
  → POST /api/credit-payments/submit  (multipart/form-data)
       Fields: receipt (file), credits (number), amount (number)
  → Backend sends receipt photo to ADMIN Telegram chat
  → Admin sees photo with [Tasdiqlash] / [Rad etish] buttons
  → Admin clicks [Tasdiqlash]
       → POST /api/telegram/webhook (callback_query)
       → Backend: user.credits += purchased_credits
       → Backend: sendMessage(user.chatId, "Kreditlar qo'shildi!")
  → User receives Telegram notification with credits added
```

#### API Endpoints for Manual Payment:

```
GET /api/check-telegram-linked
Cookie: session
Response: { linked: boolean, botUrl: string }

POST /api/telegram/link-account
Cookie: session
Body: { code: "123456" }
Response: { success: true } | { message: "Kod noto'g'ri..." }

POST /api/credit-payments/submit
Cookie: session (required)
Content-Type: multipart/form-data
Fields:
  - receipt: File (image/jpeg or image/png)
  - credits: number (e.g. 10)
  - amount: number (e.g. 50000)
Response: { success: true, paymentId: "uuid" }

GET /api/credit-payments/active
Cookie: session
Response: { payment: CreditPayment | null }
— Returns the pending payment if user has one waiting for admin approval

POST /api/credit-payments/:id/receipt-remaining
Cookie: session
Content-Type: multipart/form-data
Fields:
  - receipt: File (remaining amount receipt if paid in two parts)
Response: { success: true }
```

#### Telegram Bot Commands (for end users):
```
/start          → Welcome message, check if user is registered
/start auth     → Generate 6-digit auth code for linking account
/balance        → Show current credits balance
/history        → Show booking history
```

---

### 3.2 Stripe Payment Flow (Online Courses)

Used only for purchasing `video_collections` (online course packages).

#### Full Flow Diagram:
```
User clicks "Sotib olish" on a video collection
  → navigate to /checkout?collectionId=UUID
  → CheckoutPage mounts
  → POST /api/create-payment-intent  { collectionId: "uuid" }
       Response: { clientSecret: "pi_xxx_secret_xxx" }
  → Stripe Elements loads with clientSecret
  → User enters card details (Stripe PaymentElement)
  → User clicks "To'lash"
  → stripe.confirmPayment({ elements, confirmParams: { return_url } })
  → On success → POST /api/confirm-purchase  { collectionId, paymentIntentId }
       → Backend: creates user_purchases record
       → Response: { success: true }
  → User can now access videos in the collection
```

#### API Endpoints for Stripe:
```
POST /api/create-payment-intent
Cookie: session (required)
Body: { collectionId: "uuid" }
Response: { clientSecret: "pi_xxx_secret_xxx" }

POST /api/confirm-purchase
Cookie: session (required)
Body: { collectionId: "uuid", paymentIntentId: "pi_xxx" }
Response: { success: true }

GET /api/collections
Response: { collections: VideoCollection[] }

GET /api/collections/:id
Response: { collection: VideoCollection, classes: OnlineClass[] }
```

#### Environment Variables Required:
```env
VITE_STRIPE_PUBLIC_KEY=pk_live_xxx   (frontend, must be prefixed VITE_)
STRIPE_SECRET_KEY=sk_live_xxx        (backend, secret)
```

---

## 4. AUTHENTICATION SYSTEM

FitBoom supports two authentication methods:

### 4.1 Telegram Authentication (Primary)
```
User opens Telegram bot (@uzfitboom_bot)
  → Sends /start
  → Bot checks if user exists by telegram_id
  → [New user] Bot asks for phone number
  → User shares phone via Telegram contact button
  → Bot creates user record:
       users.telegram_id = update.from.id
       users.chat_id = update.message.chat.id
       users.phone = shared phone number
  → Bot sends welcome message + app link: https://fitboom.replit.app
  → [Existing user] Bot shows menu
```

### 4.2 Phone/OTP Authentication (Web)
```
POST /api/sms/send    { phone: "+998901234567" }
  → Backend sends OTP via SMS
  → Response: { success: true }

POST /api/sms/verify  { phone: "+998901234567", code: "1234" }
  → Response: { user: User, token: string } + sets session cookie

POST /api/register    { phone, name, age, gender }
POST /api/login       { phone, password }
POST /api/logout      → clears session

GET /api/user         → returns current logged-in user or 401
```

---

## 5. GYM BOOKING FLOW

```
GET /api/gyms                → list all gyms
GET /api/gyms/:id            → single gym details
GET /api/time-slots?gymId=X  → available time slots for gym

POST /api/book-gym
Cookie: session (required)
Body: {
  gymId: "uuid",
  timeSlotId: "uuid",
  date: "2026-04-15",        ← YYYY-MM-DD format
  time: "09:00"
}
Response: {
  booking: Booking,
  qrCode: "data:image/png;base64,..."  ← QR code image for entry
}

GET /api/bookings            → user's bookings history
DELETE /api/bookings/:id     → cancel a booking

POST /api/verify-qr          → Admin/gym scans user's QR code
Body: { qrCode: "uuid-from-booking" }
Response: { success: true, user: {...}, gym: {...} }
```

---

## 6. KEY DATA MODELS

```typescript
// User
{
  id: string (UUID),
  telegramId: string | null,
  chatId: string | null,       // Telegram chat ID for sending messages
  phone: string | null,
  name: string | null,
  credits: number,             // "Kalitlar" / Keys balance
  creditExpiryDate: Date | null,
  isAdmin: boolean,
  profileCompleted: boolean,
  profileImageUrl: string | null,
}

// Gym
{
  id: string,
  name: string,
  categories: string[],        // e.g. ["Fitness", "Yoga", "Pool"]
  credits: number,             // Cost per visit in credits
  latitude: string | null,     // parseFloat() before using
  longitude: string | null,
  imageUrl: string,
  images: string[],
  hours: string,               // "07:00 - 22:00"
  address: string,
  facilities: string | null,
  rating: number,
  ownerAccessCode: string | null,
}

// CreditPayment
{
  id: string,
  userId: string,
  credits: number,
  price: number,               // Amount in UZS
  status: "pending" | "approved" | "rejected",
  receiptUrl: string | null,
  remainingAmount: number,
  telegramMessageId: number | null,  // Message ID in admin Telegram chat
  adminChatId: string | null,
  createdAt: Date,
}
```

---

## 7. TELEGRAM BOT WEBHOOK

```
POST /api/telegram/webhook
Body: Telegram Update object (set by Telegram servers automatically)

The webhook URL is auto-set on server startup:
- Development: https://{REPLIT_DEV_DOMAIN}/api/telegram/webhook
- Production:  https://fitboom.replit.app/api/telegram/webhook

Admin Telegram IDs are stored in env var: ADMIN_IDS (comma-separated)
Example: ADMIN_IDS="5304482470,987654321"
```

---

## 8. FILE UPLOADS

```
POST /api/upload-image          → single image upload
POST /api/upload-images         → multiple images (up to 10)
Content-Type: multipart/form-data
Field name: "image" or "images"
Requires: authentication cookie

GET /api/images/:filename       → serve uploaded image
GET /api/receipts/:filename     → serve payment receipt image

Storage backend: @replit/object-storage (Replit Object Storage)
```

---

## 9. IMPLEMENTATION CHECKLIST FOR MOBILE APP

### Map Feature:
- [x] `capacitor.config.ts` — `allowNavigation` includes `*.tile.openstreetmap.org`
- [x] `capacitor.config.ts` — `server.url` points to `https://fitboom.replit.app`
- [ ] Android: Add `ACCESS_FINE_LOCATION` permission to `AndroidManifest.xml`
- [ ] iOS: Add `NSLocationWhenInUseUsageDescription` to `Info.plist`
- [ ] Build the web app: `npm run build` → `dist/public/`
- [ ] Sync Capacitor: `npx cap sync`
- [ ] Open in IDE: `npx cap open android` or `npx cap open ios`

### Payment System:
- [x] Telegram bot token set as `TELEGRAM_BOT_TOKEN` secret
- [x] Webhook auto-configured on server start
- [ ] Set `STRIPE_SECRET_KEY` secret for video purchases (optional)
- [ ] Set `VITE_STRIPE_PUBLIC_KEY` env var for video purchases (optional)

### General:
- [x] `DATABASE_URL` configured (PostgreSQL)
- [x] All database tables and columns created
- [x] Production server running at `https://fitboom.replit.app`
