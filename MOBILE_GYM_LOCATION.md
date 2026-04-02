# Zal Joylashuvi (Koordinatalar) — React Native Yo'riqnomasi

## Muhim: Koordinatalar `string` Sifatida Saqlanadi

Server `latitude` va `longitude` ni **matn (string)** ko'rinishida qaytaradi — `number` emas.
Xarita kutubxonalarida ishlatishdan oldin **`parseFloat()`** bilan raqamga aylantirish **shart**.

```
❌ gym.latitude           →  "41.3052023"   (string — xaritaga bevosita berib bo'lmaydi)
✅ parseFloat(gym.latitude) →  41.3052023   (number — xaritaga beriladi)
```

---

## API: Zallar Ro'yxatini Olish

### Oddiy so'rov (joylashuvsiz)

```http
GET /api/mobile/v1/gyms
```

### Joylashuv bilan so'rov (masofa hisoblanadi va yaqindan uzoqqa saralanadi)

```http
GET /api/mobile/v1/gyms?lat=41.3052&lng=69.2655
```

`lat` va `lng` — foydalanuvchi telefoni joylashuvi (GPS dan olinadi).

### Javob ichida gym obyekti

```json
{
  "id": "ef3ca4e9-c3c5-4f01-9159-9e3f48811b23",
  "name": "Fitzone",
  "address": "https://maps.app.goo.gl/XLEuH6GnbGpJiU9j6",
  "latitude": "41.3052023",
  "longitude": "69.26566129999999",
  "distance": "0 km",
  "distanceKm": 1.4,
  "credits": 5,
  "hours": "09:00 - 22:00"
}
```

| Maydon | Tur | Izoh |
|--------|-----|------|
| `latitude` | `string \| null` | Raqamga aylantirish kerak: `parseFloat(gym.latitude)` |
| `longitude` | `string \| null` | Raqamga aylantirish kerak: `parseFloat(gym.longitude)` |
| `address` | `string` | Google Maps URL yoki oddiy manzil matni |
| `distanceKm` | `number \| null` | Faqat `?lat=&lng=` bilan so'raganda to'ldiriladi |
| `distance` | `string` | Eski maydon (`"0 km"` — ishlatmang, `distanceKm` ishlatilsin) |

---

## Qoidalar

### Qoida 1 — Koordinatalar mavjudligini tekshirish

```typescript
function hasCoordinates(gym: Gym): boolean {
  return !!gym.latitude && !!gym.longitude &&
    !isNaN(parseFloat(gym.latitude)) &&
    !isNaN(parseFloat(gym.longitude));
}
```

Koordinatalar yo'q bo'lishi mumkin (`null`) — bu holda xarita tugmasini yashiring yoki `address` matnini ko'rsating.

### Qoida 2 — Koordinatlarni raqamga aylantirish

```typescript
const lat = parseFloat(gym.latitude!);  // 41.3052023
const lng = parseFloat(gym.longitude!); // 69.2656612
```

### Qoida 3 — Foydalanuvchi joylashuvini so'rash

```typescript
import * as Location from 'expo-location';

async function getUserLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
  };
}
```

### Qoida 4 — API so'roviga joylashuvni qo'shish

```typescript
const userLoc = await getUserLocation();

const url = userLoc
  ? `/gyms?lat=${userLoc.lat}&lng=${userLoc.lng}`
  : '/gyms';

const gyms = await fetchGyms(url);
// Joylashuv berilsa: server yaqindan uzoqqa saralab qaytaradi
// Berilmasa: har gym'ning distanceKm = null
```

---

## Xaritada Ko'rsatish (React Native Maps)

### `react-native-maps` bilan marker

```tsx
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

function GymMap({ gym }: { gym: Gym }) {
  if (!hasCoordinates(gym)) {
    return <Text>Joylashuv ma'lumoti mavjud emas</Text>;
  }

  const lat = parseFloat(gym.latitude!);
  const lng = parseFloat(gym.longitude!);

  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={{ height: 200, borderRadius: 12 }}
      initialRegion={{
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.005,   // kichik qiymat = yaqinroq zoom
        longitudeDelta: 0.005,
      }}
      scrollEnabled={false}    // karta karta ichida bo'lsa false
      zoomEnabled={false}
    >
      <Marker
        coordinate={{ latitude: lat, longitude: lng }}
        title={gym.name}
        description={typeof gym.address === 'string' && !gym.address.startsWith('http')
          ? gym.address
          : ''}
      />
    </MapView>
  );
}
```

---

## Tashqi Xaritada Ochish

```typescript
import { Linking, Platform } from 'react-native';

async function openInMaps(gym: Gym) {
  if (!hasCoordinates(gym)) {
    // Koordinata yo'q — address URL ni ochish
    if (gym.address?.startsWith('http')) {
      await Linking.openURL(gym.address);
    }
    return;
  }

  const lat = parseFloat(gym.latitude!);
  const lng = parseFloat(gym.longitude!);
  const label = encodeURIComponent(gym.name);

  // Google Maps (Android & iOS)
  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${label}`;

  // Apple Maps (faqat iOS)
  const appleUrl = `maps://?daddr=${lat},${lng}&q=${label}`;

  // Yandex Maps (O'zbekistonda keng tarqalgan)
  const yandexUrl = `yandexmaps://maps.yandex.ru/?ll=${lng},${lat}&z=16&text=${label}`;
  const yandexWebUrl = `https://yandex.uz/maps/?ll=${lng},${lat}&z=16&text=${label}`;

  if (Platform.OS === 'ios') {
    // iOS da Apple Maps yoki Google Maps tanlash
    const canOpenApple = await Linking.canOpenURL(appleUrl);
    const canOpenYandex = await Linking.canOpenURL(yandexUrl);

    if (canOpenYandex) {
      await Linking.openURL(yandexUrl);
    } else if (canOpenApple) {
      await Linking.openURL(appleUrl);
    } else {
      await Linking.openURL(googleUrl);
    }
  } else {
    // Android da Yandex yoki Google Maps
    const canOpenYandex = await Linking.canOpenURL(yandexUrl);
    if (canOpenYandex) {
      await Linking.openURL(yandexUrl);
    } else {
      await Linking.openURL(googleUrl);
    }
  }
}
```

---

## Masofani Ko'rsatish

```typescript
function formatDistance(distanceKm: number | null): string {
  if (distanceKm === null) return '';               // joylashuv ruxsati yo'q
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;  // 750 m
  return `${distanceKm.toFixed(1)} km`;             // 2.3 km
}

// Komponentda:
<Text>{formatDistance(gym.distanceKm)}</Text>
```

---

## To'liq Gym Kartochkasi Misoli

```tsx
function GymCard({ gym, onPress }: { gym: Gym; onPress: () => void }) {
  const hasLoc = hasCoordinates(gym);

  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <Image source={{ uri: gym.imageUrl }} style={styles.image} />

      <View style={styles.info}>
        <Text style={styles.name}>{gym.name}</Text>

        {/* Masofa — faqat joylashuv ruxsati bo'lsa */}
        {gym.distanceKm !== null && (
          <Text style={styles.distance}>
            📍 {formatDistance(gym.distanceKm)}
          </Text>
        )}

        {/* Manzil */}
        <Text style={styles.address} numberOfLines={1}>
          {typeof gym.address === 'string' && !gym.address.startsWith('http')
            ? gym.address
            : `${parseFloat(gym.latitude || '0').toFixed(4)}, ${parseFloat(gym.longitude || '0').toFixed(4)}`}
        </Text>

        {/* Xaritada ochish tugmasi */}
        {hasLoc && (
          <TouchableOpacity
            onPress={() => openInMaps(gym)}
            style={styles.mapButton}
          >
            <Text style={styles.mapButtonText}>Xaritada ko'rsatish</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}
```

---

## Tez-tez Uchraydigan Xatolar

| Xato | Sabab | Yechim |
|------|-------|--------|
| `NaN` xarita koordinatasi | `gym.latitude` string'ni to'g'ridan-to'g'ri `latitude` prop'ga berish | `parseFloat(gym.latitude!)` ishlatish |
| `distanceKm` har doim `null` | API ga `?lat=&lng=` parametrlar berilmagan | GPS ruxsat olingandan keyin `?lat=X&lng=Y` bilan so'rov yuborish |
| Xarita tugmasi ishlaydi, yo'nalish yo'q | Google Maps URL noto'g'ri | Yuqoridagi `googleUrl` formatini ishlating |
| Koordinatalar yo'q (`null`) gym | Admin Google Maps URL ni noto'g'ri kiritgan | `hasCoordinates()` tekshirib, tugmani yashiring |

---

## Server Endpointlari

```
Zallar ro'yxati (joylashuvsiz):
  GET  /api/mobile/v1/gyms

Zallar ro'yxati (joylashuv bilan, masofali, saralangan):
  GET  /api/mobile/v1/gyms?lat=41.3052&lng=69.2655

Bitta zal:
  GET  /api/mobile/v1/gyms/{gymId}

Base URL: https://fitboom--moydinovjavlon4.replit.app/api/mobile/v1
```

---

## Server Tomonida O'zgartirish Kerak Emas

- ✅ Koordinatalar DB da `text` sifatida saqlangan — bu to'g'ri
- ✅ Haversine formula bilan aniq masofa hisoblanadi
- ✅ `?lat=&lng=` berilganda yaqindan uzoqqa saralanadi
- ✅ `distanceKm: null` — koordinata yo'q yoki user joylashuvi berilmagan
