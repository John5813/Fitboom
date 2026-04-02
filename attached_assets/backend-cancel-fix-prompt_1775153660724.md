# Mobile API: Bronni bekor qilish (DELETE) endpoint ishlamayapti

## Muammo

Mobile ilovadan `DELETE /api/mobile/v1/bookings/{bookingId}` so'rov yuborilganda bron bekor qilinmayapti. Route mavjud (401 qaytaradi token xato bo'lganda), lekin haqiqiy token bilan so'rov yuborilganda bron bekor bo'lmayapti.

## Web API qanday ishlaydi (ishlayotgan versiya)

Saytda bronni bekor qilish to'g'ri ishlaydi. Sayt JavaScript kodi:

```js
fetch(`/api/bookings/${bookingId}`, {
  method: "DELETE",
  credentials: "include"  // session cookie
})
```

Muvaffaqiyatli javob:
```json
{
  "noRefund": false  // yoki true agar 2 soatdan kam qolgan bo'lsa
}
```

## Mobile API da nima kerak

Mobile ilova `DELETE /api/mobile/v1/bookings/{bookingId}` ga so'rov yuboradi.

Header:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

Body: yo'q (bo'sh)

### Kutilayotgan muvaffaqiyatli javob:

```json
{
  "success": true,
  "data": {
    "message": "Bron muvaffaqiyatli bekor qilindi",
    "noRefund": false,
    "creditsRefunded": 1
  }
}
```

### Kutilayotgan xato javoblar:

```json
// Bron topilmadi
{ "success": false, "error": "Bron topilmadi" }

// Allaqachon bekor qilingan
{ "success": false, "error": "Bu bron allaqachon bekor qilingan" }

// Token xato
{ "success": false, "error": "Token yaroqsiz yoki muddati o'tgan" }
```

## Tekshirish kerak bo'lgan narsalar

1. `/api/mobile/v1/bookings/:id` da DELETE handler yozilganmi? Yoki faqat GET bor?
2. Agar handler bor bo'lsa — u web API dagi `/api/bookings/:id` DELETE bilan bir xil logikani bajaradimi?
3. Mobile API middleware (Bearer token auth) DELETE methodini to'g'ri o'tkazayaptimi?

## Tuzatish

Web API da ishlaydigan bekor qilish logikasini mobile API ga ham qo'shish kerak:

```js
// Mobile API router (masalan: routes/mobile/v1/bookings.js)
router.delete("/:id", authMiddleware, async (req, res) => {
  // Web API dagi /api/bookings/:id DELETE bilan bir xil logika
  // req.user.id - foydalanuvchi ID (tokendan olingan)
  // req.params.id - bron ID
});
```

Asosiy logika:
1. Bronni topish (`req.params.id` va `req.user.id` bo'yicha)
2. Status "pending" ekanligini tekshirish
3. Bronni "cancelled" statusiga o'zgartirish
4. Kreditni qaytarish (agar 2+ soat qolgan bo'lsa)
5. Javob qaytarish: `{ success: true, data: { message, noRefund, creditsRefunded } }`
