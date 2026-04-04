# FitBoom Mobile App — Qilingan o'zgarishlar

---

## 1. Safe Area (Notch/Status bar muammosi tuzatildi)

Kontent telefon notch va status bar bilan ustma-ust chiqib ketayotgan edi. Barcha ekranlarda `useSafeAreaInsets()` o'rniga `SafeAreaView edges={["top"]}` qo'llandi.

**O'zgartirilgan fayllar:**

| Fayl | Nima qilindi |
|------|-------------|
| `app/(tabs)/index.tsx` | `useSafeAreaInsets()` → `SafeAreaView edges={["top"]}` |
| `app/(tabs)/gyms.tsx` | `useSafeAreaInsets()` → `SafeAreaView edges={["top"]}`, `Platform` import olib tashlandi |
| `app/(tabs)/profile.tsx` | `useSafeAreaInsets()` → `SafeAreaView edges={["top"]}`, `Platform` import olib tashlandi |
| `app/(tabs)/bookings.tsx` | `useSafeAreaInsets()` → `SafeAreaView edges={["top"]}`, `Platform` import olib tashlandi |
| `app/(tabs)/courses.tsx` | `useSafeAreaInsets()` → `SafeAreaView edges={["top"]}`, `Platform` import olib tashlandi |
| `app/auth.tsx` | `useSafeAreaInsets()` → `SafeAreaView edges={["top"]}` |
| `app/payment.tsx` | `useSafeAreaInsets()` → `SafeAreaView edges={["top"]}`, `Platform` import olib tashlandi |
| `app/courses/index.tsx` | `useSafeAreaInsets()` → `SafeAreaView edges={["top"]}`, `Platform` import olib tashlandi |
| `app/courses/[id].tsx` | `useSafeAreaInsets()` → `SafeAreaView edges={["top"]}`, `Platform` import olib tashlandi |
| `components/PaymentMethodModal.tsx` | `SafeAreaView` import `react-native` → `react-native-safe-area-context` ga tuzatildi |
| `app/_layout.tsx` | `StatusBar` komponenti qo'shildi |

**O'zgartirilMAgan fayllar (ataylab):**
- `scanner.tsx` — kamera overlay uchun `insets` kerak
- `map.tsx` — xarita ustidagi tugmalar uchun `insets` kerak
- `gym/[id].tsx` — rasm ustidagi "orqaga" tugma uchun `insets` kerak

---

## 2. API URL yangilash

Barcha API so'rovlar yangi production domenga yo'naltirildi.

| Fayl | Eski URL | Yangi URL |
|------|----------|-----------|
| `services/api.ts` | `fitboom--moydinovjavlon4.replit.app/api/mobile/v1` | `fitboom.replit.app/api/mobile/v1` |
| `components/PaymentMethodModal.tsx` | `fitboom--moydinovjavlon4.replit.app/mobile-pay` | `fitboom.replit.app/mobile-pay` |
| `app/(tabs)/map.tsx` | `fitboom--moydinovjavlon4.replit.app/api/mobile/v1` | `fitboom.replit.app/api/mobile/v1` |

---

## 3. O'lik kod tozalash (services/api.ts)

| Nima olib tashlandi | Sabab |
|---------------------|-------|
| `fixImageUrl()` funksiyasi | Hech qayerda ishlatilmagan |
| `uploadReceipt()` funksiyasi | Hech qayerda ishlatilmagan |

---

## 4. WebView xarita va to'lov tozalash

Xarita va to'lov funksiyalari veb-saytni WebView orqali ochishga o'tkazildi.

| Fayl | Nima qilindi |
|------|-------------|
| `components/MapWebViewModal.tsx` | **Yangi fayl** — `fitboom.replit.app/map` sahifasini WebView orqali ochadi |
| `app/(tabs)/index.tsx` | "Barchasini ko'rish" tugmasi endi `MapWebViewModal` ochadi (native xarita o'rniga) |
| `app/payment.tsx` | Karta raqami (`FALLBACK_CARD`), karta egasi, va to'lov ko'rsatmalari UI butunlay olib tashlandi (veb-sayt boshqaradi) |
