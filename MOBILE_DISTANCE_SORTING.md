# Masofaga Ko'ra Saralash — Qanday Ishlaydi

## Asosiy Prinsip

```
Foydalanuvchi GPS joylashuvi → API ga yuboriladi → Server har zal uchun masofa hisoblaydi
→ Yaqindan uzoqqa tartibda qaytaradi → Ilova shunday ko'rsatadi
```

Server **Haversine** formulasidan foydalanadi (Yer shari yuzasi bo'ylab haqiqiy masofa). Natija kilometrda, 1 o'nlik aniqlikda: `1.4 km`, `0.3 km`.

---

## API Ishlatish Tartibi

### 1-qadam — Foydalanuvchi joylashuvini olish

```typescript
import * as Location from 'expo-location';

async function getUserCoords() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
  };
}
```

### 2-qadam — Zallarni masofali so'rash

```typescript
const coords = await getUserCoords();

const url = coords
  ? `https://fitboom--moydinovjavlon4.replit.app/api/mobile/v1/gyms?lat=${coords.lat}&lng=${coords.lng}`
  : `https://fitboom--moydinovjavlon4.replit.app/api/mobile/v1/gyms`;

const res = await fetch(url, {
  headers: { 'Authorization': `Bearer ${accessToken}` },
});
const json = await res.json();
const gyms = json.data.gyms; // allaqachon yaqindan uzoqqa tartibda
```

### 3-qadam — `distanceKm` ni ko'rsatish

```typescript
function formatDistance(distanceKm: number | null): string {
  if (distanceKm === null) return '';                          // joylashuv yo'q
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`; // 750 m
  return `${distanceKm.toFixed(1)} km`;                       // 2.3 km
}
```

---

## Javob Tarkibi

```json
{
  "success": true,
  "data": {
    "gyms": [
      {
        "id": "...",
        "name": "Fitzone",
        "distanceKm": 0.8,
        "latitude": "41.3052023",
        "longitude": "69.26566129999999"
      },
      {
        "id": "...",
        "name": "PowerGym",
        "distanceKm": 2.3,
        "latitude": "41.3112000",
        "longitude": "69.2800000"
      },
      {
        "id": "...",
        "name": "SportPlus",
        "distanceKm": null,
        "latitude": null,
        "longitude": null
      }
    ],
    "total": 3
  }
}
```

| `distanceKm` qiymati | Ma'nosi |
|---------------------|---------|
| `0.8` | 800 metr uzoqlikda |
| `null` (joylashuv berilmagan) | Foydalanuvchi GPS ruxsatini bermagan |
| `null` (koordinata yo'q) | Zal adminstratorida manzil kiritilmagan |

**Saralash:** `distanceKm: null` bo'lgan zallar **oxirga** tushadi, koordinatasi bor zallar esa yaqindan uzoqqa tartibda keladi.

---

## Qoidalar

### Qoida 1 — GPS ruxsatini bir marta so'rang, natijani saqlang

```typescript
// store/locationStore.ts
const useLocationStore = create((set) => ({
  coords: null,
  permissionDenied: false,

  fetchLocation: async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      set({ permissionDenied: true });
      return;
    }
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    set({ coords: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
  },
}));
```

### Qoida 2 — Ruxsat berilmasa ham ishlash

```typescript
// Ruxsat yo'q → joylashuvsiz so'rov yuboriladi → zallar saralanmay keladi
// distanceKm: null → "📍" belgisini ko'rsatmang
```

### Qoida 3 — Ekran ochilganda bir marta so'rang

```typescript
useEffect(() => {
  const { coords, fetchLocation } = useLocationStore.getState();
  if (!coords) fetchLocation(); // faqat ma'lumot yo'q bo'lsa
}, []);
```

### Qoida 4 — So'rovda `lat` va `lng` **ikkisi** birga bo'lishi shart

```
✅ ?lat=41.3052&lng=69.2655   → masofa hisoblanadi
❌ ?lat=41.3052               → faqat lat → masofa hisoblanmaydi
❌ ?lng=69.2655               → faqat lng → masofa hisoblanmaydi
❌ (parametrsiz)              → distanceKm = null
```

### Qoida 5 — Joylashuv belgisini faqat `distanceKm` bo'lganda ko'rsating

```tsx
{gym.distanceKm !== null && (
  <Text style={styles.distance}>
    📍 {formatDistance(gym.distanceKm)}
  </Text>
)}
```

---

## Filtrlash va Saralash Kombinatsiyasi

Barcha parametrlarni birga ishlatish mumkin:

```typescript
// Yaqin "Yoga" zallarini qidirish
const url = `/gyms?lat=${lat}&lng=${lng}&category=Yoga`;

// Yaqin zallarni qidirish + ism bo'yicha
const url = `/gyms?lat=${lat}&lng=${lng}&search=fitzone`;

// Faqat kategoriya (masofasiz)
const url = `/gyms?category=Gym`;
```

**Server filtrlash tartibi:**
1. Kategoriya filtri qo'llanadi
2. Qidiruv filtri qo'llanadi
3. Masofa hisoblanadi
4. Yaqindan uzoqqa saralanadi

---

## Zallar Ro'yxati Komponenti (Misol)

```tsx
function GymList() {
  const { coords, fetchLocation, permissionDenied } = useLocationStore();
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocation(); // GPS so'rash
  }, []);

  useEffect(() => {
    loadGyms();
  }, [coords]); // coords o'zgarganda qayta yuklash

  async function loadGyms() {
    setLoading(true);
    const query = coords ? `?lat=${coords.lat}&lng=${coords.lng}` : '';
    const res = await fetch(`${BASE_URL}/gyms${query}`);
    const json = await res.json();
    setGyms(json.data.gyms);
    setLoading(false);
  }

  return (
    <View>
      {permissionDenied && (
        <Text style={styles.hint}>
          Joylashuvingizni yoqsangiz, yaqin zallar birinchi chiqadi
        </Text>
      )}

      <FlatList
        data={gyms}
        keyExtractor={g => g.id}
        renderItem={({ item: gym }) => (
          <View style={styles.gymCard}>
            <Text style={styles.gymName}>{gym.name}</Text>

            {gym.distanceKm !== null
              ? <Text style={styles.distance}>📍 {formatDistance(gym.distanceKm)}</Text>
              : <Text style={styles.noDistance}>Manzil aniqlanmadi</Text>
            }
          </View>
        )}
      />
    </View>
  );
}
```

---

## Hisoblash Formulasi (Ma'lumot Uchun)

Server **Haversine** formulasidan foydalanadi:

```
R = 6371 km (Yer radiusi)

dLat = (zalLat - userLat) × π/180
dLng = (zalLng - userLng) × π/180

a = sin²(dLat/2) + cos(userLat) × cos(zalLat) × sin²(dLng/2)

distanceKm = R × 2 × atan2(√a, √(1-a))
```

Natija `0.1 km` aniqlikda yaxlitlanadi: `1.4 km`, `0.3 km`, `12.7 km`.

---

## Server Endpointi

```
GET  /api/mobile/v1/gyms
     ?lat={foydalanuvchi_latitude}   ← majburiy emas, lekin masofa uchun kerak
     &lng={foydalanuvchi_longitude}  ← majburiy emas, lekin masofa uchun kerak
     &category={kategoriya_id}       ← ixtiyoriy
     &search={qidiruv_matni}         ← ixtiyoriy

Base URL: https://fitboom--moydinovjavlon4.replit.app/api/mobile/v1

Auth: Bearer token talab qilinmaydi (ochiq endpoint)
```
