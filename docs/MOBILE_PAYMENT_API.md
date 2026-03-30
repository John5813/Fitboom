# Mobile Payment API — To'lov tizimi

## Overview

Foydalanuvchi kredit sotib olish uchun to'lov chekini yuboradi. Admin Telegram orqali tasdiqlaydi, rad etadi yoki "qisman" deb belgilaydi.

---

## Endpoint: GET /api/mobile/v1/credits

Kredit holati, paketlar va to'lov statusini qaytaradi.

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
    "packages": [
      { "credits": 10, "price": 50000, "priceFormatted": "50 000 so'm" },
      { "credits": 20, "price": 90000, "priceFormatted": "90 000 so'm" }
    ],
    "pendingPayment": {
      "id": "abc-123",
      "credits": 10,
      "price": 50000,
      "remainingAmount": 50000,
      "status": "pending",
      "createdAt": "2026-03-30T10:00:00.000Z"
    },
    "activePartialPayment": {
      "id": "abc-123",
      "credits": 10,
      "price": 50000,
      "remainingAmount": 20000,
      "status": "partial",
      "createdAt": "2026-03-30T10:00:00.000Z"
    },
    "pendingPaymentsCount": 1
  }
}
```

### Maydonlar

| Maydon | Tur | Tavsif |
|--------|-----|--------|
| `pendingPayment` | object \| null | Tekshirilayotgan to'lov. Agar null bo'lmasa — chek admin tomonidan hali ko'rilmagan. `id` ni saqlang, keyinchalik kerak bo'ladi. |
| `activePartialPayment` | object \| null | Admin "qisman" deb belgilagan to'lov. `remainingAmount` — qoldiq to'lanadigan summa. Agar null bo'lmasa — foydalanuvchiga qoldiq summani ko'rsating. |
| `pendingPaymentsCount` | number | Tekshirilayotgan to'lovlar soni (backward compat) |

---

## To'lov holatlari (status)

| Status | Ma'nosi | UI qilish kerak |
|--------|---------|-----------------|
| `pending` | Chek admin tomonidan ko'rilmoqda | "To'lovingiz tekshirilmoqda..." banner ko'rsating |
| `partial` | Admin qisman tasdiqladi, qoldiq bor | Qoldiq summani va chek yuklash tugmasini ko'rsating |
| `approved` | To'lov tasdiqlandi, kreditlar berildi | Kreditlar hisobga qo'shildi |
| `rejected` | To'lov rad etildi | Xato xabari ko'rsating |

---

## Partial payment (qoldiq to'lov) UI mantig'i

```javascript
const creditsData = response.data.data;

if (creditsData.activePartialPayment) {
  const { id, remainingAmount, credits, price } = creditsData.activePartialPayment;
  // Ko'rsating: "Siz X so'm to'ladingiz, qoldiq Y so'm"
  // Tugma: "Qoldiq to'lovni yuborish" → POST /api/mobile/v1/credits/purchase/:id/remaining
}

if (!creditsData.activePartialPayment && creditsData.pendingPayment) {
  const { id } = creditsData.pendingPayment;
  // Ko'rsating: "To'lovingiz tekshirilmoqda..."
  // Poll qilish uchun: GET /api/mobile/v1/credits/payment/:id/status
}
```

---

## Endpoint: POST /api/mobile/v1/credits/purchase

Yangi to'lov chekini yuborish.

**Auth:** Bearer token  
**Content-Type:** multipart/form-data

**Body:**
| Maydon | Tavsif |
|--------|--------|
| `receipt` | Chek rasmi (image file) |
| `credits` | Kredit miqdori (10, 20, 50...) |
| `price` | To'lov summasi (ixtiyoriy, default narx ishlatiladi) |

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "abc-123",
    "credits": 10,
    "price": 50000,
    "message": "Chek yuborildi. Admin tasdiqlashini kuting."
  }
}
```

> **Muhim:** `paymentId` ni saqlang. `activePartialPayment` paydo bo'lsa, shu ID bilan qoldiq chek yuborasiz.

---

## Endpoint: POST /api/mobile/v1/credits/purchase/:id/remaining

Qoldiq summani to'lash uchun chek yuborish. Faqat `activePartialPayment` mavjud bo'lganda ishlatiladi.

**Auth:** Bearer token  
**Content-Type:** multipart/form-data  
**URL param:** `:id` — `activePartialPayment.id`

**Body:**
| Maydon | Tavsif |
|--------|--------|
| `receipt` | Qoldiq to'lov cheki rasmi |

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Qoldiq chek yuborildi. Admin tasdiqlashini kuting.",
    "remainingAmount": 20000
  }
}
```

---

## Endpoint: GET /api/mobile/v1/credits/payment/:id/status

To'lov statusini tekshirish (polling uchun).

**Auth:** Bearer token

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "abc-123",
    "status": "partial",
    "credits": 10,
    "price": 50000,
    "remainingAmount": 20000,
    "currentBalance": 5,
    "creditExpiryDate": "2026-04-30T00:00:00.000Z"
  }
}
```

---

## To'liq flow

```
1. Foydalanuvchi paket tanlaydi
2. POST /credits/purchase (chek yuklaydi)  →  paymentId oladi
3. GET /credits  →  pendingPayment.id bilan tekshiradi
4. Admin "pending" ko'radi, Telegram orqali qaror qabul qiladi:
   a. "Tasdiqlash"  →  status: approved, kreditlar beriladi ✅
   b. "Rad etish"   →  status: rejected ❌
   c. "Summani o'zgartirish" + summa kiritadi  →  status: partial
5. Agar partial:
   - GET /credits  →  activePartialPayment.remainingAmount ko'rsatiladi
   - POST /credits/purchase/:id/remaining (qoldiq chek yuklaydi)
   - Admin tasdiqlaydi  →  status: approved, kreditlar beriladi ✅
```

---

## Eslatmalar

- `GET /credits` ni har safar payment ekraniga kirganda yangilang (`useFocusEffect` ishlatish tavsiya etiladi)
- Response strukturasi: `response.data.data.activePartialPayment` (axios uchun)
- `pendingPaymentsCount` backward compat uchun saqlanadi, lekin `pendingPayment` ob'ektini ishlating
