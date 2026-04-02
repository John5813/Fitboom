# QR Skaner — React Native Integratsiya Yo'riqnomasi

## Umumiy Tushuncha: Kim Nimani Skanerlaydi?

```
FOYDALANUVCHI   →   Telefon kamerasi bilan   →   ZAL DEVORIGDAGI QR kodini skanerlaydi
                                                         ↓
                                              /api/mobile/v1/bookings/verify-qr
                                                         ↓
                                              Server: "Sening bugungi bronin bor, kiraver!"
```

**Muhim:** Foydalanuvchi **o'z bronining QR kodini** emas, **zalning devorida osig'liq QR kodini** skanerlaydi.

---

## Skanerdan Serverga: To'g'ri Tartib

### Qadam 1 — QR Kodni O'qish

Kamera kutubxonasi (`expo-camera`, `react-native-vision-camera`, `react-native-qrcode-scanner` va boshqalar) skanerlangan matnni qaytaradi. Bu matn **JSON string** ko'rinishida bo'ladi.

Zal devorigdagi QR kod ichidagi ma'lumot:
```json
{
  "gymId": "ef3ca4e9-c3c5-4f01-9159-9e3f48811b23",
  "type": "gym",
  "name": "Fitzone",
  "timestamp": "2026-04-02T19:02:31.079Z"
}
```

### Qadam 2 — Serverga Yuborish

```http
POST /api/mobile/v1/bookings/verify-qr
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json

{
  "qrData": "{\"gymId\":\"ef3ca4e9-c3c5-4f01-9159-9e3f48811b23\",\"type\":\"gym\",\"name\":\"Fitzone\",\"timestamp\":\"2026-04-02T19:02:31.079Z\"}"
}
```

> `qrData` — kamera kutubxonasi qaytargan **xom string** (JSON.parse qilmasdan, to'g'ridan-to'g'ri yuborish). Server o'zi parse qiladi.

### Qadam 3 — Serverdan Javob

**Muvaffaqiyatli kirish (200):**
```json
{
  "success": true,
  "message": "Fitzone ga xush kelibsiz!",
  "data": {
    "gym": {
      "id": "ef3ca4e9-...",
      "name": "Fitzone",
      "imageUrl": "/api/images/..."
    },
    "booking": {
      "id": "bron-id",
      "date": "2026-04-02",
      "time": "09:00",
      "isCompleted": true,
      "status": "completed"
    },
    "visitRecorded": true
  }
}
```

---

## Xato Holatlari va Ularga Munosabat

| HTTP | `error` matni | Sabab | Foydalanuvchiga ko'rsating |
|------|--------------|-------|---------------------------|
| `400` | `QR kod ma'lumoti talab qilinadi` | `qrData` body'da yo'q | Qayta skaner qiling |
| `400` | `QR kod formati noto'g'ri` | JSON parse xatosi | Bu QR FitBoom QR emas |
| `400` | `QR kod zal identifikatorini o'z ichiga olmagan` | `gymId` yo'q | Bu QR FitBoom QR emas |
| `404` | `Sport zal topilmadi` | Zal o'chirib yuborilgan | Zalga murojaat qiling |
| `400` | `Bugun bu zalda faol broningiz yo'q` | Bron yo'q yoki allaqachon yakunlangan | Avval bron qiling |
| `400` | `Siz juda erta keldingiz. Kirish HH:MM dan boshlanadi` | Boshlanishidan 1 soat oldin | Vaqtni kuting |
| `401` | Token xatosi | Token muddati o'tgan | Tokenni yangilang |

---

## React Native Kodi

```typescript
// api/qr.ts

const BASE_URL = 'https://fitboom--moydinovjavlon4.replit.app/api/mobile/v1';

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
import { CameraView, useCameraPermissions } from 'expo-camera'; // yoki boshqa kutubxona
import { verifyGymQR } from '../api/qr';
import { useAuthStore } from '../store/auth';

export function QRScannerScreen({ navigation }) {
  const { accessToken } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleBarCodeScanned = async ({ data: rawQrString }: { data: string }) => {
    // 1. Bir marta skanerlash uchun bloklash
    if (!scanning || loading) return;
    setScanning(false);
    setLoading(true);

    try {
      // 2. QR validatsiya — FitBoom QR ekanligini tekshirish
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

      // 3. Serverga yuborish
      const result = await verifyGymQR(rawQrString, accessToken);

      // 4. Muvaffaqiyat ekrani
      navigation.replace('QRSuccess', {
        gymName: result.gym.name,
        gymImage: result.gym.imageUrl,
        bookingTime: result.booking.time,
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
      <View style={styles.center}>
        <Text>Kamera ruxsati kerak</Text>
        <Button title="Ruxsat berish" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />

      {/* Ramka */}
      <View style={styles.overlay}>
        <View style={styles.scanFrame} />
        <Text style={styles.hint}>
          {loading ? 'Tekshirilmoqda...' : 'Zal QR kodini skanerlang'}
        </Text>
      </View>

      {loading && (
        <ActivityIndicator
          size="large"
          color="#FF6B35"
          style={styles.loader}
        />
      )}
    </View>
  );
}
```

---

## Muhim Qoidalar (Server Tekshiradi)

### 1. Vaqt oynasi — Boshlanishidan 1 soat oldin kirish mumkin
```
Bron vaqti: 10:00
Eng erta kirish: 09:00  ✅
08:59 da kirish:  ❌ "Juda erta keldingiz. Kirish 09:00 dan boshlanadi"
```

### 2. Faqat bugungi bron
```
Bugun: 2-aprel     →  2-aprelga bron bor  ✅
Bugun: 2-aprel     →  3-aprelga bron bor  ❌ "Bugun bu zalda faol broningiz yo'q"
```

### 3. Status tekshiruvi
```
status: 'pending'   + isCompleted: false  →  ✅ Kirish mumkin
status: 'completed' yoki isCompleted: true →  ❌ Allaqachon kirgan
status: 'cancelled'                        →  ❌ Bekor qilingan
```

### 4. Zal QR vs Bron QR — Farqi
| | Zal QR (devorga osig'liq) | Bron QR (foydalanuvchi bronida) |
|--|--------------------------|-------------------------------|
| **Maqsad** | Foydalanuvchi skanerlaydi → zal kirish | Zal egasi skanerlaydi → tasdiqlash (web app) |
| **Kim skanerlaydi** | Mobil ilova foydalanuvchisi | Zal egasi (web paneldan) |
| **Endpoint** | `POST /bookings/verify-qr` | `POST /api/verify-qr` (web) |
| **Ichida nima bor** | `gymId`, `type: "gym"` | `gymId`, `userId`, `bookingId` |

**Mobil ilova uchun faqat Zal QR (birinchi ustun) muhim.**

---

## Server Endpoint Ma'lumoti

```
URL:    POST https://fitboom--moydinovjavlon4.replit.app/api/mobile/v1/bookings/verify-qr
Auth:   Bearer {accessToken}
Body:   { "qrData": "<kamera qaytargan xom JSON string>" }

Muvaffaqiyat: { success: true, data: { gym, booking, visitRecorded: true } }
Xato:         { success: false, error: "<sabab>" }
```

---

## Server Tomonida O'zgartirish Kerak Emas

Backend to'liq tayyor:
- ✅ Foydalanuvchi tokenini tekshiradi  
- ✅ QR ni parse qilib `gymId` ni oladi  
- ✅ Bugungi faol bronni topadi  
- ✅ 1 soat oldingi kirish qoidasini tekshiradi  
- ✅ Bronni `completed` ga o'tkazadi  
- ✅ Zal daromadini hisoblaydi  
- ✅ Tashrif tarixini yozadi  
