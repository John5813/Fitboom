# Mobile Payment API — To'lov tizimi

## Overview

Foydalanuvchi kredit sotib olish uchun to'lov chekini yuboradi. Admin Telegram orqali tasdiqlaydi, rad etadi yoki "qisman" deb belgilaydi.

---

## ⚠️ "Token topilmadi" muammosi

`/mobile-pay` sahifasi darhol URL parametrlarini tekshiradi:

```typescript
const token = params.get("token") || "";
if (!token) {
  return <div>Token topilmadi</div>; // ← darhol yopiladi
}
```

**Token faqat URL query parametr orqali keladi:**

```
https://fitboom.replit.app/mobile-pay?token=eyJhbGciOiJIUzI1NiJ9...
```

**Header orqali:** ❌  
**Cookie orqali:** ❌  
**URL parametr orqali:** ✅ — `?token=<accessToken>`

---

## To'g'ri URL olish

```javascript
// 1. Avval credits endpointidan tayyor URL ni ol
const response = await fetch('https://fitboom.replit.app/api/mobile/v1/credits', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
const data = await response.json();

// 2. Tayyor paymentUrl ni WebView da och (token allaqachon ichida)
openWebView(data.data.paymentUrl);
// Misol: "https://fitboom.replit.app/mobile-pay?token=eyJhbGci..."
```

Token backend tomonidan avtomatik qo'shiladi. Qo'lda qo'shishga hojat yo'q.

---

## To'lov sahifasi — 3 qadam

```
1-qadam: Paket tanlash
   ┌──────────────────────────────┐
   │  60 kredit  — 60,000 so'm   │
   │  130 kredit — 130,000 so'm  │ ← mashhur
   │  240 kredit — 240,000 so'm  │
   └──────────────────────────────┘

2-qadam: To'lov ma'lumotlari
   - Karta raqami: 9860 1601 0456 2378
   - Karta egasi: Javlonbek Mo'ydinov
   - "Nusxa olish" tugmasi
   - "Chek rasmini yuborish" tugmasi

3-qadam: Muvaffaqiyat
   - "Chek yuborildi!" xabari
   - Tanlangan paket ko'rsatiladi
   - Admin tasdiqlashini kutish haqida eslatma
```

Sahifa o'z-o'zidan `POST /api/mobile/v1/credits/purchase` ga murojaat qiladi, ilova bu so'rovni qo'lda yuborishi shart emas.

---

## Endpoint: GET /api/mobile/v1/credits

Kredit holati, paketlar, to'lov statusini va WebView URLlarini qaytaradi.

**Auth:** Bearer token

### Response

```json
{
  "success": true,
  "data": {
    "credits": 5,
    "creditExpiryDate": "2026-04-30T00:00:00.000Z",
    "daysUntilExpiry": 30,
    "isExpired": false,
    "paymentUrl": "https://fitboom.replit.app/mobile-pay?token=eyJhbGci...",
    "mapUrl": "https://fitboom.replit.app/map?token=eyJhbGci...",
    "packages": [
      { "credits": 60, "price": 60000, "priceFormatted": "60 000 so'm" },
      { "credits": 130, "price": 130000, "priceFormatted": "130 000 so'm" },
      { "credits": 240, "price": 240000, "priceFormatted": "240 000 so'm" }
    ],
    "pendingPayment": {
      "id": "abc-123",
      "credits": 130,
      "price": 130000,
      "remainingAmount": 130000,
      "status": "pending",
      "createdAt": "2026-03-30T10:00:00.000Z"
    },
    "activePartialPayment": {
      "id": "abc-123",
      "credits": 130,
      "price": 130000,
      "remainingAmount": 50000,
      "status": "partial",
      "createdAt": "2026-03-30T10:00:00.000Z"
    },
    "pendingPaymentsCount": 1
  }
}
```

### Muhim maydonlar

| Maydon | Tavsif |
|--------|--------|
| `paymentUrl` | WebView da ochish uchun tayyor URL (token ichida) |
| `mapUrl` | Karta WebView uchun tayyor URL |
| `pendingPayment` | Admin hali ko'rmagan to'lov. `id` ni saqlang. |
| `activePartialPayment` | Admin "qisman" belgilagan to'lov. `remainingAmount` — qoldiq summa. |

---

## To'lov holatlari (status)

| Status | Ma'nosi | UI qilish kerak |
|--------|---------|-----------------|
| `pending` | Chek admin tomonidan ko'rilmoqda | "To'lovingiz tekshirilmoqda..." banner |
| `partial` | Admin qisman tasdiqladi, qoldiq bor | Qoldiq summani va chek yuklash tugmasini ko'rsating |
| `approved` | To'lov tasdiqlandi, kreditlar berildi | Kreditlar hisobga qo'shildi ✅ |
| `rejected` | To'lov rad etildi | Xato xabari ko'rsating ❌ |

---

## Qisman to'lov (partial) UI mantig'i

```javascript
const creditsData = response.data.data;

if (creditsData.activePartialPayment) {
  const { id, remainingAmount, credits, price } = creditsData.activePartialPayment;
  // Ko'rsating: "Qoldiq: X so'm to'lang"
  // Tugma: "Qoldiq chekni yuborish" → POST /api/mobile/v1/credits/purchase/:id/remaining
}

if (!creditsData.activePartialPayment && creditsData.pendingPayment) {
  const { id } = creditsData.pendingPayment;
  // Ko'rsating: "To'lovingiz tekshirilmoqda..."
  // Polling: GET /api/mobile/v1/credits/payment/:id/status
}
```

---

## Endpoint: POST /api/mobile/v1/credits/purchase

Yangi to'lov chekini yuborish. (WebView sahifasi o'zi chaqiradi)

**Auth:** Bearer token  
**Content-Type:** multipart/form-data

| Maydon | Tavsif |
|--------|--------|
| `receipt` | Chek rasmi (image file) |
| `credits` | 60, 130 yoki 240 |
| `price` | Ixtiyoriy (default narx ishlatiladi) |

**Javob:**
```json
{
  "success": true,
  "data": {
    "paymentId": "abc-123",
    "credits": 130,
    "price": 130000,
    "message": "Chek yuborildi. Admin tasdiqlashini kuting."
  }
}
```

---

## Endpoint: POST /api/mobile/v1/credits/purchase/:id/remaining

Qoldiq summani to'lash uchun chek yuborish. Faqat `activePartialPayment` mavjud bo'lganda.

**Auth:** Bearer token  
**Content-Type:** multipart/form-data  
**URL param:** `:id` — `activePartialPayment.id`

| Maydon | Tavsif |
|--------|--------|
| `receipt` | Qoldiq to'lov cheki rasmi |

---

## Endpoint: GET /api/mobile/v1/credits/payment/:id/status

To'lov statusini tekshirish (polling uchun).

**Auth:** Bearer token

```json
{
  "success": true,
  "data": {
    "paymentId": "abc-123",
    "status": "partial",
    "credits": 130,
    "price": 130000,
    "remainingAmount": 50000,
    "currentBalance": 5,
    "creditExpiryDate": "2026-04-30T00:00:00.000Z"
  }
}
```

---

## Admin tasdiqlash (Telegram bot)

1. Foydalanuvchi chek yuboradi → Telegram bot adminga xabar yuboradi:
   ```
   💳 Yangi to'lov so'rovi
   👤 Ism: Alisher
   📱 Telefon: +998901234567
   💰 Miqdor: 130,000 so'm
   🎯 Kredit: 130 ta
   [✅ Tasdiqlash] [❌ Rad etish] [⚡ Qisman tasdiqlash]
   ```
2. **Tasdiqlash** → kreditlar foydalanuvchi hisobiga tushadi → Telegram xabar keladi
3. **Qisman tasdiqlash** → admin qoldiq miqdorni kiritadi → foydalanuvchiga Telegram xabar keladi
4. **Rad etish** → foydalanuvchiga Telegram xabar keladi

---

## To'liq oqim

```
1. GET /credits → paymentUrl olish
2. WebView da paymentUrl ochish
3. Sahifada paket tanlash
4. Karta raqamiga pul o'tkazish
5. Chek rasmini yuborish → WebView sahifasi o'zi POST qiladi
6. "Chek yuborildi!" sahifasi ko'rinadi
7. Admin Telegram botda tasdiqlaydi
   a. approved → kreditlar tushadi ✅
   b. rejected → rad etildi ❌
   c. partial  → qoldiq summa bor
      → GET /credits → activePartialPayment
      → WebView yoki ilova ichida qoldiq chekni yuborish
      → Admin tasdiqlaydi → kreditlar tushadi ✅
```

---

## Xato holatlari

| Xato xabari | Sabab | Yechim |
|-------------|-------|--------|
| `Token topilmadi` | URL da `?token=` yo'q | `paymentUrl` ni `/api/mobile/v1/credits` dan oling |
| `Token yaroqsiz` | Token muddati o'tgan (1 soat) | `/api/mobile/v1/auth/refresh` bilan yangilang |
| `Noto'g'ri kredit paketi` | 60/130/240 dan boshqa qiymat | Faqat ruxsat etilgan paketlarni yuborish |
| `Chek rasmi talab qilinadi` | Fayl tanlanmagan | `receipt` sifatida rasm faylini qo'shing |

---

## Eslatmalar

- `GET /credits` ni payment ekraniga har kirganida yangilang (`useFocusEffect` tavsiya etiladi)
- Response strukturasi (axios uchun): `response.data.data.activePartialPayment`
- `pendingPaymentsCount` backward compat uchun saqlanadi, lekin `pendingPayment` ob'ektini ishlating
