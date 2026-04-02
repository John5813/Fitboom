# "Barchasini Ko'rish" — Xaritada Zallar Ekrani

## Ekran Vazifasi

Foydalanuvchi "Barchasini ko'rish" tugmasini bosganda ochiluvchi xarita ekrani:
- Barcha mavjud zallarni **marker (pin)** sifatida ko'rsatadi
- Foydalanuvchi o'z joylashuvini ko'radi
- Markerni bosib, zal kartochkasini (pastki panel) ochadi
- Kartochkadan zal sahifasiga yoki bronlashga o'tadi

---

## Ma'lumotlarni Olish

### API So'rovi

```http
GET /api/mobile/v1/gyms?lat={userLat}&lng={userLng}
```

- `lat`, `lng` — foydalanuvchi joylashuvi (GPS). Berilib bo'lmasa — parametrsiz yuborilsin.
- Javob: zallar **yaqindan uzoqqa** tartibda keladi.
- Har bir zalda `latitude`, `longitude` — **string**, `distanceKm` — **number | null**.

### Natija Obyekti

```json
{
  "success": true,
  "data": {
    "gyms": [
      {
        "id": "ef3ca4e9-...",
        "name": "Fitzone",
        "imageUrl": "https://fitboom--moydinovjavlon4.replit.app/api/images/...",
        "address": "https://maps.app.goo.gl/...",
        "latitude": "41.3052023",
        "longitude": "69.26566129999999",
        "credits": 5,
        "hours": "09:00 - 22:00",
        "rating": 5,
        "avgRating": 4.7,
        "ratingCount": 12,
        "distanceKm": 1.4,
        "categories": [{ "id": "gym", "name": "Gym", "icon": "dumbbell" }]
      }
    ],
    "total": 1
  }
}
```

---

## Xaritada Ko'rsatish Qoidalari

### Qoida 1 — Faqat koordinatali zallarni markerlash

```typescript
const mappableGyms = gyms.filter(
  g => g.latitude && g.longitude &&
       !isNaN(parseFloat(g.latitude)) &&
       !isNaN(parseFloat(g.longitude))
);
```

Koordinatasi yo'q zallar xaritada emas, faqat pastdagi ro'yxatda ko'rsatilsin.

### Qoida 2 — Koordinatalarni raqamga aylantirish

```typescript
const coord = {
  latitude: parseFloat(gym.latitude!),
  longitude: parseFloat(gym.longitude!),
};
```

### Qoida 3 — Boshlang'ich kamera joylashuvi

```
Agar foydalanuvchi joylashuvi mavjud → kamera uning ustida
Agar mavjud emas                     → Toshkent markazi (41.2995, 69.2401)
```

```typescript
const TASHKENT = { latitude: 41.2995, longitude: 69.2401 };

const initialRegion = userLocation
  ? { ...userLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 }
  : { ...TASHKENT,     latitudeDelta: 0.15, longitudeDelta: 0.15 };
```

### Qoida 4 — Marker rangi va holati

```
Tanlangan zal markeri  →  FitBoom asosiy rang (#FF6B35 — to'q sariq-qizil)
Oddiy zal markeri      →  Oq yoki kulrang
Foydalanuvchi nuqtasi  →  Ko'k doira (xarita kutubxonasi built-in)
```

---

## To'liq Komponent Kodi

```tsx
// screens/MapAllGymsScreen.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, Image, TouchableOpacity,
  ActivityIndicator, FlatList, StyleSheet, Dimensions
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet'; // yoki modal

const BASE_URL = 'https://fitboom--moydinovjavlon4.replit.app/api/mobile/v1';
const TASHKENT = { latitude: 41.2995, longitude: 69.2401 };
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function MapAllGymsScreen({ navigation }) {
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [gyms, setGyms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedGym, setSelectedGym] = useState<any | null>(null);

  // ── 1. Joylashuv va zallarni yuklash ──────────────────────────────
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Joylashuv ruxsatini so'rash
      const { status } = await Location.requestForegroundPermissionsAsync();
      let loc: { latitude: number; longitude: number } | null = null;

      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        loc = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setUserLocation(loc);
      }

      // Zallarni yuklash (joylashuv bilan yoki usiz)
      const query = loc ? `?lat=${loc.latitude}&lng=${loc.longitude}` : '';
      const res = await fetch(`${BASE_URL}/gyms${query}`);
      const json = await res.json();

      if (json.success) {
        setGyms(json.data.gyms);
      }
    } catch (err) {
      console.error('MapAllGyms: ma\'lumot yuklanmadi', err);
    } finally {
      setLoading(false);
    }
  }

  // ── 2. Marker bosilganda ──────────────────────────────────────────
  const handleMarkerPress = useCallback((gym: any) => {
    setSelectedGym(gym);

    // Xaritani markerlangan zalga siljitish
    mapRef.current?.animateToRegion({
      latitude: parseFloat(gym.latitude) - 0.002, // pastki panel uchun biroz yuqoriga
      longitude: parseFloat(gym.longitude),
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 400);

    // Pastki panelni ochish
    bottomSheetRef.current?.expand();
  }, []);

  // ── 3. Xaritaning bo'sh joyiga bosish — tanlashni bekor qilish ───
  const handleMapPress = useCallback(() => {
    setSelectedGym(null);
    bottomSheetRef.current?.collapse();
  }, []);

  // ── 4. Foydalanuvchi joylashuviga qaytish ────────────────────────
  const goToUserLocation = () => {
    if (!userLocation) return;
    mapRef.current?.animateToRegion({
      ...userLocation,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }, 500);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Zallar yuklanmoqda...</Text>
      </View>
    );
  }

  const mappableGyms = gyms.filter(
    g => g.latitude && g.longitude &&
         !isNaN(parseFloat(g.latitude)) &&
         !isNaN(parseFloat(g.longitude))
  );

  const initialRegion = userLocation
    ? { ...userLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : { ...TASHKENT, latitudeDelta: 0.15, longitudeDelta: 0.15 };

  return (
    <View style={styles.container}>
      {/* ── Xarita ── */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        showsUserLocation={true}          // ko'k nuqta (GPS)
        showsMyLocationButton={false}     // o'zimiz custom tugma yasaymiz
        onPress={handleMapPress}
      >
        {mappableGyms.map(gym => (
          <Marker
            key={gym.id}
            coordinate={{
              latitude: parseFloat(gym.latitude),
              longitude: parseFloat(gym.longitude),
            }}
            onPress={() => handleMarkerPress(gym)}
            pinColor={selectedGym?.id === gym.id ? '#FF6B35' : '#888888'}
            title={gym.name}
          />
        ))}
      </MapView>

      {/* ── Joylashuvga qaytish tugmasi ── */}
      {userLocation && (
        <TouchableOpacity style={styles.myLocationBtn} onPress={goToUserLocation}>
          <Text style={styles.myLocationIcon}>◎</Text>
        </TouchableOpacity>
      )}

      {/* ── Koordinatasi bo'lmagan zallar soni ── */}
      {gyms.length > mappableGyms.length && (
        <View style={styles.noCoordBadge}>
          <Text style={styles.noCoordText}>
            {gyms.length - mappableGyms.length} ta zalning manzili ko'rsatilmadi
          </Text>
        </View>
      )}

      {/* ── Pastki panel: tanlangan zal ── */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['35%']}
        enablePanDownToClose
        onClose={() => setSelectedGym(null)}
      >
        <BottomSheetView style={styles.sheet}>
          {selectedGym && <GymCard gym={selectedGym} navigation={navigation} />}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

// ── Zal kartochkasi ──────────────────────────────────────────────────
function GymCard({ gym, navigation }) {
  return (
    <View style={styles.card}>
      <Image
        source={{ uri: gym.imageUrl }}
        style={styles.cardImage}
        resizeMode="cover"
      />
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{gym.name}</Text>

        <View style={styles.cardRow}>
          {gym.distanceKm !== null && (
            <Text style={styles.cardDistance}>
              📍 {gym.distanceKm < 1
                ? `${Math.round(gym.distanceKm * 1000)} m`
                : `${gym.distanceKm.toFixed(1)} km`}
            </Text>
          )}
          <Text style={styles.cardCredits}>🔑 {gym.credits} kredit</Text>
          <Text style={styles.cardHours}>🕐 {gym.hours}</Text>
        </View>

        {gym.avgRating && (
          <Text style={styles.cardRating}>
            ⭐ {gym.avgRating.toFixed(1)} ({gym.ratingCount} ta sharh)
          </Text>
        )}

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.detailBtn}
            onPress={() => navigation.navigate('GymDetail', { gymId: gym.id })}
          >
            <Text style={styles.detailBtnText}>Batafsil</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() => navigation.navigate('BookGym', { gymId: gym.id })}
          >
            <Text style={styles.bookBtnText}>Bron qilish</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
```

---

## Ekran Holatlari

| Holat | Ko'rsatiladigan narsa |
|-------|----------------------|
| Yuklanmoqda | `ActivityIndicator` — markazda |
| Zallar bor, joylashuv bor | Foydalanuvchi ustida zoom, barcha markerlar |
| Zallar bor, joylashuv yo'q | Toshkent markazi, barcha markerlar |
| Zal tanlanmagan | Pastki panel yopiq |
| Zal tanlangan | Marker to'q rang, pastki panel ochiq |
| Koordinatasi yo'q zal | Faqat pastki ro'yxatda (xaritada emas) |
| Hech qanday zal yo'q | "Hozircha zallar mavjud emas" matni |

---

## Tartib: Foydalanuvchi Harakatlari

```
Ekran ochildi
    │
    ▼
GPS ruxsati so'raladi
    │
    ├── Ruxsat berildi → GET /gyms?lat=X&lng=Y  → yaqindan uzoqqa
    └── Rad etildi    → GET /gyms               → distanceKm = null
    │
    ▼
Zallar xaritada marker sifatida ko'rinadi
    │
    ▼
Foydalanuvchi markerni bosadi
    │
    ▼
Xarita u tomonga siljiydi + pastki panel ko'tariladi
    │
    ├── "Batafsil" bosildi   → GymDetail ekrani
    ├── "Bron qilish" bosildi → BookGym ekrani
    └── Xaritaga bosildi     → panel yopiladi, marker oq rangga qaytadi
```

---

## Server Endpointlari

```
Zallar ro'yxati:
  GET  /api/mobile/v1/gyms
  GET  /api/mobile/v1/gyms?lat=41.2995&lng=69.2401
  GET  /api/mobile/v1/gyms?category=Gym
  GET  /api/mobile/v1/gyms?search=fitzone&lat=41.2995&lng=69.2401

Bitta zal:
  GET  /api/mobile/v1/gyms/{gymId}

Base URL: https://fitboom--moydinovjavlon4.replit.app/api/mobile/v1
```

---

## Server Tomonida O'zgartirish Kerak Emas

- ✅ Barcha koordinatalar DB da mavjud
- ✅ `?lat=&lng=` berilganda masofa hisoblanadi va saralanadi
- ✅ `distanceKm: null` — joylashuv berilmagan
- ✅ Kategoriya va qidiruv filtrlari ishlaydi
