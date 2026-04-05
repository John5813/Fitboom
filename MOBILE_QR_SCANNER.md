# QR Skaner Tizimi — To'liq Tahlil

## Umumiy Tushuncha

```
FOYDALANUVCHI         →    Zalning DEVORIDA osig'liq QR kodini skanerlaydi
(Mobil ilova)                          ↓
                       POST /api/mobile/v1/bookings/verify-qr
                                       ↓
                       Server: "Bugungi bronin bor, kiraver!" → Bron yopiladi
```

**Muhim farq:**
| | Kim uchun | Kim skanerlaydi |
|--|-----------|-----------------|
| **Zal QR** (devorda osig'liq) | Foydalanuvchi skanerlaydi | Mobil ilova |
| **Bron QR** (foydalanuvchi bronida) | Zal egasi skanerlaydi | Web admin panel |

**Mobil ilova uchun faqat Zal QR muhim.**

---

## QR Kod Ichidagi Ma'lumot

Zal devorigdagi QR kod — bu JSON string:

```json
{
  "gymId": "ef3ca4e9-c3c5-4f01-9159-9e3f48811b23",
  "type": "gym",
  "name": "Fitzone",
  "timestamp": "2026-04-02T19:02:31.079Z"
}
```

Kamera kutubxonasi bu string ni qaytaradi. **Ilova bu stringni o'zgartirmay, to'g'ridan-to'g'ri serverga yuboradi.**

---

## Skanerdan Serverga: So'rov

```http
POST https://fitboom.replit.app/api/mobile/v1/bookings/verify-qr
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "qrData": "{\"gymId\":\"ef3ca4e9-c3c5-4f01-9159-9e3f48811b23\",\"type\":\"gym\",\"name\":\"Fitzone\",\"timestamp\":\"2026-04-02T19:02:31.079Z\"}"
}
```

> `qrData` — kamera qaytargan **xom string** (JSON.parse qilmasdan yuborish). Server o'zi parse qiladi.

---

## Server Nima Qiladi (ichki mantiq)

```
1. Token tekshiradi (Bearer)           → foydalanuvchini aniqlaydi
2. qrData ni JSON.parse qiladi        → gymId oladi
3. gymId bo'yicha zalning mavjudligini tekshiradi
4. Foydalanuvchining BUGUNGI bronlarini tekshiradi:
   - gymId mos kelishi kerak
   - sana = bugun (Toshkent vaqti)
   - status = "pending"
   - isCompleted = false
5. Vaqt qoidasini tekshiradi:
   - Bron vaqti 10:00 bo'lsa → 09:00 dan oldin kelsa ❌
   - 09:00 dan keyin kelsa ✅
6. Bronni "completed" ga o'tkazadi
7. Tashrif tarixini yozadi (gym_visits jadvaliga)
8. Zal daromadini yangilaydi
9. Muvaffaqiyat javobi qaytaradi
```

---

## Serverdan Javob

### Muvaffaqiyatli kirish (200)

```json
{
  "success": true,
  "data": {
    "message": "Fitzone ga xush kelibsiz!",
    "gym": {
      "id": "ef3ca4e9-...",
      "name": "Fitzone",
      "imageUrl": "https://fitboom.replit.app/api/images/..."
    },
    "booking": {
      "id": "bron-uuid",
      "date": "2026-04-05",
      "time": "10:00",
      "isCompleted": true,
      "status": "completed"
    },
    "visitRecorded": true
  }
}
```

### Xato holatlari

| HTTP | `error` matni | Sabab | Ilovada ko'rsatish |
|------|--------------|-------|--------------------|
| `400` | `QR kod ma'lumoti talab qilinadi` | `qrData` body'da yo'q | "Qayta skaner qiling" |
| `400` | `QR kod formati noto'g'ri` | JSON parse xatosi | "Bu FitBoom QR emas" |
| `400` | `QR kod zal identifikatorini o'z ichiga olmagan` | `gymId` yo'q | "Bu FitBoom QR emas" |
| `404` | `Sport zal topilmadi` | Zal o'chirib yuborilgan | "Zalga murojaat qiling" |
| `400` | `Bugun bu zalda faol broningiz yo'q` | Bron yo'q yoki yakunlangan | "Avval bron qiling" |
| `400` | `Siz juda erta keldingiz. Kirish HH:MM dan boshlanadi` | Boshlanishidan 1 soat oldin | Vaqtni ko'rsating |
| `401` | Token xatosi | Token muddati o'tgan | Tokenni yangilab qaytaring |

---

## Server Tekshiruvlari (qoidalar)

### 1. Vaqt oynasi — 1 soat oldin kirish mumkin
```
Bron vaqti:   10:00
Eng erta:     09:00  ✅ kirish mumkin
08:59 da:              ❌ "Juda erta keldingiz. Kirish 09:00 dan boshlanadi"
```

### 2. Faqat bugungi bron
```
Bugun: 5-aprel  →  5-aprelga bron bor  ✅
Bugun: 5-aprel  →  6-aprelga bron bor  ❌ "Bugun bu zalda faol broningiz yo'q"
```

### 3. Bron holati
```
status: 'pending'  + isCompleted: false  →  ✅ Kirish mumkin
status: 'completed' yoki isCompleted: true  →  ❌ "Allaqachon kirgan"
status: 'cancelled'                          →  ❌ "Bekor qilingan"
```

---

## Mobil Ilovada Kod

### API funksiyasi

```typescript
// api/qr.ts

const BASE_URL = 'https://fitboom.replit.app/api/mobile/v1';

export async function verifyGymQR(rawQrString: string, accessToken: string) {
  const response = await fetch(`${BASE_URL}/bookings/verify-qr`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      qrData: rawQrString, // kamera qaytargan xom string, o'zgartirmasdan
    }),
  });

  const json = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.error || 'QR tekshirishda xatolik');
  }

  return json.data; // { gym, booking, visitRecorded }
}
```

### Skaner Komponent

```tsx
// screens/QRScannerScreen.tsx
import { CameraView, useCameraPermissions } from 'expo-camera';
import { verifyGymQR } from '../api/qr';
import { useAuthStore } from '../store/auth';

export function QRScannerScreen({ navigation }) {
  const { accessToken } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleBarCodeScanned = async ({ data: rawQrString }: { data: string }) => {
    if (!scanning || loading) return;
    setScanning(false);
    setLoading(true);

    try {
      // 1. FitBoom QR ekanligini tekshirish (ixtiyoriy oldindan tekshiruv)
      let parsed: any;
      try {
        parsed = JSON.parse(rawQrString);
      } catch {
        Alert.alert('Xatolik', "Bu FitBoom QR kodi emas");
        setScanning(true);
        return;
      }

      if (parsed.type !== 'gym' || !parsed.gymId) {
        Alert.alert('Xatolik', "Bu FitBoom zal QR kodi emas");
        setScanning(true);
        return;
      }

      // 2. Serverga yuborish
      const result = await verifyGymQR(rawQrString, accessToken);

      // 3. Muvaffaqiyat — ilovaga ma'lumot qaytadi
      navigation.replace('QRSuccess', {
        gymName: result.gym.name,
        gymImage: result.gym.imageUrl,
        bookingTime: result.booking.time,
        bookingId: result.booking.id,
      });

    } catch (error: any) {
      Alert.alert('Kirish rad etildi', error.message, [
        { text: 'OK', onPress: () => setScanning(true) },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!permission?.granted) {
    return (
      <View>
        <Text>Kamera ruxsati kerak</Text>
        <Button title="Ruxsat berish" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={{ flex: 1 }}
        onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />
      <View style={{ position: 'absolute', bottom: 40, alignSelf: 'center' }}>
        <Text style={{ color: 'white' }}>
          {loading ? 'Tekshirilmoqda...' : 'Zal QR kodini skanerlang'}
        </Text>
      </View>
    </View>
  );
}
```

---

## To'liq Oqim (Boshidan Oxirigacha)

```
1. BRON QILISH
   Foydalanuvchi → zal tanlaydi → vaqt slotini tanlaydi
   POST /api/mobile/v1/bookings
   → Server: 1 kredit hisobdan chiqariladi, bron yaratiladi
   → Bron ma'lumotlari: { id, gymId, date, time, qrCode, status: "pending" }

2. ZALGA BORISH
   Foydalanuvchi → zalning devorida osig'liq QR kodni kameraga tutadi

3. SKANERLASH
   Ilova → kamera QR matnni o'qiydi → verifyGymQR() chaqiriladi
   POST /api/mobile/v1/bookings/verify-qr
   Body: { qrData: "<zal QR matni>" }
   Authorization: Bearer <accessToken>

4. SERVER JAVOB BERADI
   ✅ Muvaffaqiyat:
      {
        success: true,
        data: {
          message: "Fitzone ga xush kelibsiz!",
          gym: { id, name, imageUrl },
          booking: { id, date, time, isCompleted: true, status: "completed" },
          visitRecorded: true
        }
      }

5. ILOVA MUVAFFAQIYAT EKRANINI KO'RSATADI
   → "Xush kelibsiz!" + zal nomi
   → Bookings ro'yxatini yangilash (bron "completed" bo'ldi)

6. ❌ Agar xato:
   → Alert.alert("Kirish rad etildi", error.message)
   → Skaner qayta yoqiladi
```

---

## Backend Tayyor — O'zgartirish Shart Emas

- ✅ Bearer token tekshiruvi
- ✅ QR parse va gymId aniqlash
- ✅ Bugungi faol bronni topish
- ✅ 1 soat oldin kirish qoidasi
- ✅ Bronni `completed` ga o'tkazish
- ✅ Tashrif tarixini yozish (`gym_visits`)
- ✅ Zal daromadini hisoblash va yangilash
