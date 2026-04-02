# Bronni Bekor Qilish — React Native Integratsiya Yo'riqnomasi

## Muammo

"Bekor qilish" tugmasi hozir faqat `GET /bookings` chaqiryapti (ekranni yangilaydi), lekin avval **DELETE** yoki **POST** request yuborib bronni serverdagi bekor qilmayapti.

---

## Server Endpointlari (Tayyor, To'g'ri Ishlaydi)

Ikkala endpoint ham bir xil `cancelBookingHandler` funksiyasini ishlatadi:

```
DELETE  /api/mobile/v1/bookings/:id
POST    /api/mobile/v1/bookings/:id/cancel
```

**Tavsiya:** React Native fetch `DELETE` methodiga qulayroq muammolar chiqarishi mumkin, shuning uchun **`POST .../cancel`** ishlatishni tavsiya etamiz.

### Request

```http
POST /api/mobile/v1/bookings/{BOOKING_ID}/cancel
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json
```

Body: **bo'sh** (hech narsa yubormaslik kerak)

### Muvaffaqiyatli Javob (200)

```json
{
  "success": true,
  "message": "Bron muvaffaqiyatli bekor qilindi",
  "data": {
    "noRefund": false,
    "creditsRefunded": 5
  }
}
```

Agar boshlanishiga 2 soatdan kam qolgan bo'lsa:
```json
{
  "success": true,
  "message": "Bron bekor qilindi. Boshlanishiga 2 soatdan kam qolganligi sababli kredit qaytarilmadi.",
  "data": {
    "noRefund": true,
    "creditsRefunded": 0
  }
}
```

### Xato Javoblari

| Status | Ma'no |
|--------|-------|
| `401`  | Token yo'q yoki muddati o'tgan |
| `403`  | Bu bron boshqa foydalanuvchiniki |
| `404`  | Bron topilmadi |
| `400`  | Allaqachon bekor qilingan yoki yakunlangan |

---

## React Native Kodi (To'g'ri Implementatsiya)

### 1. API Funksiyasi

```typescript
// api/bookings.ts

const BASE_URL = 'https://fitboom--moydinovjavlon4.replit.app/api/mobile/v1';

export async function cancelBooking(bookingId: string, accessToken: string) {
  const response = await fetch(`${BASE_URL}/bookings/${bookingId}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const json = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.error || 'Bronni bekor qilishda xatolik');
  }

  return json.data; // { noRefund: boolean, creditsRefunded: number }
}
```

### 2. Komponentdagi Tugma (React Native)

```tsx
// screens/BookingsScreen.tsx yoki BookingCard.tsx

import { cancelBooking } from '../api/bookings';
import { useAuthStore } from '../store/auth'; // sizning token store'ingiz

function BookingCard({ booking, onRefresh }) {
  const { accessToken } = useAuthStore();
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    // 1. Foydalanuvchidan tasdiqlash so'rash
    Alert.alert(
      'Bronni bekor qilish',
      'Haqiqatan ham bu bronni bekor qilmoqchimisiz?',
      [
        { text: 'Yo\'q', style: 'cancel' },
        {
          text: 'Ha, bekor qilish',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);

              // 2. API ga bekor qilish so'rovi yuborish ← BU QISM YO'Q EDI
              const result = await cancelBooking(booking.id, accessToken);

              // 3. Natijani foydalanuvchiga ko'rsatish
              if (result.noRefund) {
                Alert.alert(
                  'Bekor qilindi',
                  `Bron bekor qilindi. Boshlanishiga 2 soatdan kam qolganligi sababli kredit qaytarilmadi.`
                );
              } else {
                Alert.alert(
                  'Muvaffaqiyatli!',
                  `Bron bekor qilindi. ${result.creditsRefunded} kredit hisobingizga qaytarildi.`
                );
              }

              // 4. Bronlar ro'yxatini yangilash
              onRefresh(); // GET /bookings — FAQAT shu yerda chaqiriladi

            } catch (error: any) {
              Alert.alert('Xatolik', error.message || 'Bronni bekor qilishda xatolik yuz berdi');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  // Faqat pending bronlar uchun tugma ko'rsatish
  if (booking.status !== 'pending' || booking.isCompleted) return null;

  return (
    <TouchableOpacity
      onPress={handleCancel}
      disabled={cancelling}
      style={styles.cancelButton}
    >
      {cancelling
        ? <ActivityIndicator color="#fff" />
        : <Text style={styles.cancelText}>Bekor qilish</Text>
      }
    </TouchableOpacity>
  );
}
```

### 3. Token Muddati O'tgan Bo'lsa — Refresh

Agar `401` xatosi kelsa, access token yangilash kerak:

```typescript
export async function cancelBookingWithRefresh(
  bookingId: string,
  accessToken: string,
  refreshToken: string,
  onTokenRefreshed: (newTokens: { accessToken: string; refreshToken: string }) => void
) {
  try {
    return await cancelBooking(bookingId, accessToken);
  } catch (err: any) {
    if (err.status === 401) {
      // Token yangilash
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const refreshJson = await refreshRes.json();
      if (refreshJson.success) {
        onTokenRefreshed(refreshJson.data);
        return await cancelBooking(bookingId, refreshJson.data.accessToken);
      }
    }
    throw err;
  }
}
```

---

## Qisqacha: Nima O'zgardi

| Holat | Xato (Hozir) | To'g'ri |
|-------|-------------|---------|
| Tugma bosildi | `GET /bookings` chaqiriladi | `POST /bookings/:id/cancel` → `GET /bookings` |
| Natija | Faqat ekran yangilanadi | Bron bekor qilinadi, kredit qaytariladi, ekran yangilanadi |

---

## Server Endpoint URL'lari (Production)

```
Base URL: https://fitboom--moydinovjavlon4.replit.app/api/mobile/v1

Bronni bekor qilish:
  POST   /bookings/{id}/cancel        ← Tavsiya etilgan
  DELETE /bookings/{id}               ← Ham ishlaydi

Tokenni yangilash:
  POST   /auth/refresh
  Body:  { "refreshToken": "..." }
```

---

## Server Tomonida Hech Narsa O'zgartirish Shart Emas

Backend to'liq tayyor:
- ✅ Bron foydalanuvchiga tegishligini tekshiradi
- ✅ Allaqachon bekor qilingan/yakunlanganini tekshiradi  
- ✅ 2 soat qoidasiga ko'ra kredit qaytaradi
- ✅ Time slot bo'sh joyini oshiradi
- ✅ Statusni `cancelled` ga o'zgartiradi
