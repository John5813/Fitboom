# FitBoom — To'liq React Native Ilova Spesifikatsiyasi

## Muhim ma'lumotlar

```
Production API: https://fitboom--gangster5813.replit.app/api/mobile/v1
Telegram Bot:   @uzfitboom_bot
```

## Loyiha Tuzilmasi

```
fitboom/
├── src/
│   ├── api/
│   │   └── client.ts          ← Barcha API so'rovlar
│   ├── store/
│   │   └── authStore.ts       ← Token + user holati (Zustand)
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── PhoneScreen.tsx
│   │   │   ├── OtpScreen.tsx
│   │   │   ├── TelegramScreen.tsx
│   │   │   └── CompleteProfileScreen.tsx
│   │   ├── home/
│   │   │   └── HomeScreen.tsx
│   │   ├── gyms/
│   │   │   ├── GymsScreen.tsx
│   │   │   ├── GymDetailScreen.tsx
│   │   │   └── BookingScreen.tsx
│   │   ├── bookings/
│   │   │   ├── BookingsScreen.tsx
│   │   │   └── BookingDetailScreen.tsx
│   │   ├── qr/
│   │   │   └── QrScannerScreen.tsx
│   │   ├── credits/
│   │   │   └── CreditsScreen.tsx
│   │   ├── collections/
│   │   │   ├── CollectionsScreen.tsx
│   │   │   ├── CollectionDetailScreen.tsx
│   │   │   └── VideoPlayerScreen.tsx
│   │   └── profile/
│   │       └── ProfileScreen.tsx
│   ├── navigation/
│   │   └── AppNavigator.tsx
│   └── components/
│       └── LoadingOverlay.tsx
├── App.tsx
└── package.json
```

## Kerakli Paketlar

```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "expo-secure-store": "~13.0.0",
    "expo-camera": "~15.0.0",
    "expo-barcode-scanner": "~13.0.0",
    "expo-image-picker": "~15.0.0",
    "expo-location": "~17.0.0",
    "react-native-maps": "1.14.0",
    "@react-navigation/native": "^6.1.18",
    "@react-navigation/native-stack": "^6.11.0",
    "@react-navigation/bottom-tabs": "^6.6.1",
    "react-native-screens": "~3.31.1",
    "react-native-safe-area-context": "4.10.5",
    "zustand": "^4.5.4",
    "react-native-video": "^6.3.3"
  }
}
```

---

## 1. API CLIENT — `src/api/client.ts`

```typescript
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'https://fitboom--gangster5813.replit.app/api/mobile/v1';

// Token saqlash
export const TokenStorage = {
  async getAccess(): Promise<string | null> {
    return SecureStore.getItemAsync('accessToken');
  },
  async getRefresh(): Promise<string | null> {
    return SecureStore.getItemAsync('refreshToken');
  },
  async save(access: string, refresh: string): Promise<void> {
    await SecureStore.setItemAsync('accessToken', access);
    await SecureStore.setItemAsync('refreshToken', refresh);
  },
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
  },
};

// Asosiy so'rov funksiyasi
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  const token = await TokenStorage.getAccess();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });

    const json = await res.json();

    // Token muddati tugagan — yangilash urinish
    if (res.status === 401) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        // Qayta urinish
        const newToken = await TokenStorage.getAccess();
        headers['Authorization'] = `Bearer ${newToken}`;
        const retry = await fetch(`${BASE_URL}${path}`, { ...options, headers });
        return await retry.json();
      }
      return { success: false, error: "Sessiya tugadi. Qayta kiring." };
    }

    return json;
  } catch (err) {
    return { success: false, error: "Internet aloqa yo'q" };
  }
}

// FormData so'rovi (rasm yuklash uchun)
async function requestForm<T>(
  path: string,
  formData: FormData
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  const token = await TokenStorage.getAccess();
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    return await res.json();
  } catch {
    return { success: false, error: "Internet aloqa yo'q" };
  }
}

async function tryRefreshToken(): Promise<boolean> {
  const refresh = await TokenStorage.getRefresh();
  if (!refresh) return false;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    const json = await res.json();
    if (json.success && json.data?.accessToken) {
      await SecureStore.setItemAsync('accessToken', json.data.accessToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ─── AUTH ───────────────────────────────────────────────
export const AuthAPI = {
  sendSms: (phone: string) =>
    request('/auth/sms/send', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  verifySms: (phone: string, code: string) =>
    request<{
      accessToken: string;
      refreshToken: string;
      isNewUser: boolean;
      user: User;
    }>('/auth/sms/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    }),

  verifyTelegram: (code: string) =>
    request<{
      accessToken: string;
      refreshToken: string;
      isNewUser: boolean;
      user: User;
    }>('/auth/telegram/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  completeProfile: (name: string, age: number, gender: 'Erkak' | 'Ayol') =>
    request<{ user: User }>('/auth/complete-profile', {
      method: 'POST',
      body: JSON.stringify({ name, age, gender }),
    }),

  refresh: (refreshToken: string) =>
    request<{ accessToken: string; user: User }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
};

// ─── USER ────────────────────────────────────────────────
export const UserAPI = {
  me: () => request<{ user: User }>('/user/me'),

  updateProfile: (data: { name?: string; age?: number; gender?: 'Erkak' | 'Ayol' }) =>
    request<{ user: User }>('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  uploadAvatar: (imageUri: string, mimeType: string) => {
    const form = new FormData();
    form.append('image', { uri: imageUri, name: 'avatar.jpg', type: mimeType } as any);
    return requestForm<{ imageUrl: string; user: User }>('/user/avatar', form);
  },

  stats: () =>
    request<{
      credits: number;
      creditExpiryDate: string | null;
      daysUntilExpiry: number | null;
      totalBookings: number;
      completedVisits: number;
      upcomingBookings: number;
      missedBookings: number;
    }>('/user/stats'),
};

// ─── GYMS ────────────────────────────────────────────────
export const GymsAPI = {
  list: (params?: { category?: string; search?: string; lat?: number; lng?: number }) => {
    const q = new URLSearchParams();
    if (params?.category) q.append('category', params.category);
    if (params?.search) q.append('search', params.search);
    if (params?.lat) q.append('lat', String(params.lat));
    if (params?.lng) q.append('lng', String(params.lng));
    const qs = q.toString();
    return request<{ gyms: Gym[]; total: number }>(`/gyms${qs ? '?' + qs : ''}`);
  },

  detail: (id: string) =>
    request<{ gym: Gym; timeSlots: TimeSlot[] }>(`/gyms/${id}`),

  slots: (id: string, date: string) =>
    request<{ date: string; dayOfWeek: string; isClosed: boolean; slots: TimeSlot[] }>(
      `/gyms/${id}/slots?date=${date}`
    ),

  rate: (gymId: string, bookingId: string, rating: number) =>
    request(`/gyms/${gymId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ bookingId, rating }),
    }),
};

// ─── BOOKINGS ────────────────────────────────────────────
export const BookingsAPI = {
  list: (status?: 'pending' | 'completed' | 'missed' | 'cancelled') =>
    request<{ bookings: Booking[]; total: number }>(
      `/bookings${status ? '?status=' + status : ''}`
    ),

  detail: (id: string) =>
    request<{ booking: Booking; gym: Gym; hasRated: boolean }>(`/bookings/${id}`),

  create: (gymId: string, timeSlotId: string, date: string) =>
    request<{ booking: Booking; creditsUsed: number; remainingCredits: number }>('/bookings', {
      method: 'POST',
      body: JSON.stringify({ gymId, timeSlotId, date }),
    }),

  cancel: (id: string) =>
    request<{ message: string; refunded: boolean; creditsRefunded: number }>(
      `/bookings/${id}`,
      { method: 'DELETE' }
    ),

  verifyQr: (qrData: string) =>
    request<{ message: string; gym: Gym; booking: Booking; visitRecorded: boolean }>(
      '/bookings/verify-qr',
      {
        method: 'POST',
        body: JSON.stringify({ qrData }),
      }
    ),
};

// ─── CREDITS ────────────────────────────────────────────
export const CreditsAPI = {
  status: () =>
    request<{
      credits: number;
      creditExpiryDate: string | null;
      daysUntilExpiry: number | null;
      isExpired: boolean;
      packages: CreditPackage[];
      activePartialPayment: CreditPayment | null;
      pendingPaymentsCount: number;
    }>('/credits'),

  purchase: (credits: number, price: number, receiptUri: string, mimeType: string) => {
    const form = new FormData();
    form.append('credits', String(credits));
    form.append('price', String(price));
    form.append('receipt', { uri: receiptUri, name: 'receipt.jpg', type: mimeType } as any);
    return requestForm<{ message: string; paymentId: string }>('/credits/purchase', form);
  },

  submitRemaining: (paymentId: string, receiptUri: string, mimeType: string) => {
    const form = new FormData();
    form.append('receipt', { uri: receiptUri, name: 'receipt.jpg', type: mimeType } as any);
    return requestForm<{ message: string }>(`/credits/purchase/${paymentId}/remaining`, form);
  },
};

// ─── COLLECTIONS ─────────────────────────────────────────
export const CollectionsAPI = {
  list: (category?: string) =>
    request<{ collections: Collection[]; total: number }>(
      `/collections${category ? '?category=' + category : ''}`
    ),

  detail: (id: string) =>
    request<{
      collection: Collection;
      classes: VideoClass[];
      hasAccess: boolean;
    }>(`/collections/${id}`),

  purchase: (id: string) =>
    request<{ message: string; creditsUsed: number; remainingCredits: number }>(
      `/collections/${id}/purchase`,
      { method: 'POST' }
    ),
};

export const ClassesAPI = {
  detail: (id: string) =>
    request<{ class: VideoClass; collection: { id: string; name: string; isFree: boolean } }>(
      `/classes/${id}`
    ),
};

export const PartnershipAPI = {
  submit: (hallName: string, phone: string) =>
    request('/partnership', {
      method: 'POST',
      body: JSON.stringify({ hallName, phone }),
    }),
};

// ─── TYPES ───────────────────────────────────────────────
export interface User {
  id: string;
  phone: string | null;
  name: string | null;
  age: number | null;
  gender: 'Erkak' | 'Ayol' | null;
  profileImageUrl: string | null;
  credits: number;
  creditExpiryDate: string | null;
  isAdmin: boolean;
  profileCompleted: boolean;
  telegramId: string | null;
  chatId: string | null;
  createdAt: string;
}

export interface Gym {
  id: string;
  name: string;
  categories: string[];
  credits: number;
  distance: string;
  hours: string;
  imageUrl: string;
  images: string[];
  address: string;
  description: string | null;
  rating: number;
  facilities: string | null;
  latitude: string | null;
  longitude: string | null;
  closedDays: string[];
  avgRating: number | null;
  ratingCount: number;
  distanceKm: number | null;
}

export interface TimeSlot {
  id: string;
  gymId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  capacity: number;
  availableSpots: number;
  isAvailable?: boolean;
}

export interface Booking {
  id: string;
  userId: string;
  gymId: string;
  date: string;
  time: string;
  qrCode: string;
  isCompleted: boolean;
  timeSlotId: string | null;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
  status: 'pending' | 'completed' | 'missed' | 'cancelled';
  createdAt: string;
}

export interface CreditPackage {
  credits: number;
  price: number;
  priceFormatted: string;
}

export interface CreditPayment {
  id: string;
  userId: string;
  credits: number;
  price: number;
  status: 'pending' | 'partial' | 'completed' | 'rejected';
  receiptUrl: string | null;
  remainingAmount: number;
  createdAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  price: number;
  isFree: boolean;
  thumbnailUrl: string;
  categories: string[];
  isPurchased: boolean;
  classCount: number;
}

export interface VideoClass {
  id: string;
  collectionId: string;
  title: string;
  description: string | null;
  categories: string[];
  duration: number;
  instructor: string | null;
  thumbnailUrl: string;
  videoUrl: string | null;
  orderIndex: number;
  isLocked?: boolean;
}
```

---

## 2. AUTH STORE — `src/store/authStore.ts`

```typescript
import { create } from 'zustand';
import { User, TokenStorage, UserAPI } from '../api/client';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  init: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: true }),

  logout: async () => {
    await TokenStorage.clear();
    set({ user: null, isAuthenticated: false });
  },

  init: async () => {
    set({ isLoading: true });
    try {
      const token = await TokenStorage.getAccess();
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      const res = await UserAPI.me();
      if (res.success) {
        set({ user: res.data.user, isAuthenticated: true });
      } else {
        await TokenStorage.clear();
        set({ isAuthenticated: false });
      }
    } catch {
      set({ isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },
}));
```

---

## 3. NAVIGATION — `src/navigation/AppNavigator.tsx`

```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../store/authStore';

// Auth Screens
import PhoneScreen from '../screens/auth/PhoneScreen';
import OtpScreen from '../screens/auth/OtpScreen';
import TelegramScreen from '../screens/auth/TelegramScreen';
import CompleteProfileScreen from '../screens/auth/CompleteProfileScreen';

// App Screens
import HomeScreen from '../screens/home/HomeScreen';
import GymsScreen from '../screens/gyms/GymsScreen';
import GymDetailScreen from '../screens/gyms/GymDetailScreen';
import BookingScreen from '../screens/gyms/BookingScreen';
import BookingsScreen from '../screens/bookings/BookingsScreen';
import BookingDetailScreen from '../screens/bookings/BookingDetailScreen';
import QrScannerScreen from '../screens/qr/QrScannerScreen';
import CreditsScreen from '../screens/credits/CreditsScreen';
import CollectionsScreen from '../screens/collections/CollectionsScreen';
import CollectionDetailScreen from '../screens/collections/CollectionDetailScreen';
import VideoPlayerScreen from '../screens/collections/VideoPlayerScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#FF6B00',   // FitBoom asosiy rang
        tabBarInactiveTintColor: '#888',
        tabBarStyle: { backgroundColor: '#1a1a1a', borderTopColor: '#333' },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Asosiy', tabBarIcon: /* ikon */ () => null }}
      />
      <Tab.Screen
        name="Gyms"
        component={GymsScreen}
        options={{ title: 'Zallar', tabBarIcon: () => null }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{ title: 'Bronlar', tabBarIcon: () => null }}
      />
      <Tab.Screen
        name="Credits"
        component={CreditsScreen}
        options={{ title: 'Kredit', tabBarIcon: () => null }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profil', tabBarIcon: () => null }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) return null; // Splash screen

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // AUTH OQIMI
          <>
            <Stack.Screen name="Phone" component={PhoneScreen} />
            <Stack.Screen name="Otp" component={OtpScreen} />
            <Stack.Screen name="Telegram" component={TelegramScreen} />
            <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
          </>
        ) : user && !user.profileCompleted ? (
          // PROFIL TO'LDIRISH
          <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
        ) : (
          // ASOSIY ILOVA
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="GymDetail" component={GymDetailScreen} />
            <Stack.Screen name="Booking" component={BookingScreen} />
            <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
            <Stack.Screen name="QrScanner" component={QrScannerScreen} />
            <Stack.Screen name="Collections" component={CollectionsScreen} />
            <Stack.Screen name="CollectionDetail" component={CollectionDetailScreen} />
            <Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

---

## 4. PHONE SCREEN — `src/screens/auth/PhoneScreen.tsx`

```typescript
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { AuthAPI } from '../../api/client';

export default function PhoneScreen({ navigation }: any) {
  const [phone, setPhone] = useState('+998');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (phone.length < 13) {
      Alert.alert('Xatolik', "Telefon raqamini to'liq kiriting (+998XXXXXXXXX)");
      return;
    }
    setLoading(true);
    const res = await AuthAPI.sendSms(phone);
    setLoading(false);

    if (res.success) {
      navigation.navigate('Otp', { phone });
    } else {
      Alert.alert('Xatolik', res.error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Logo */}
      <View style={styles.logoWrap}>
        <Text style={styles.logo}>FitBoom</Text>
        <Text style={styles.tagline}>Sport zallarini bron qiling</Text>
      </View>

      <Text style={styles.title}>Telefon raqamingizni kiriting</Text>
      <Text style={styles.subtitle}>
        SMS orqali tasdiqlash kodi yuboramiz
      </Text>

      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="+998901234567"
        placeholderTextColor="#666"
        maxLength={13}
      />

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleSend}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>SMS Yuborish</Text>
        )}
      </TouchableOpacity>

      {/* Telegram orqali kirish */}
      <TouchableOpacity
        style={styles.telegramBtn}
        onPress={() => navigation.navigate('Telegram')}
      >
        <Text style={styles.telegramText}>📱 Telegram orqali kirish</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#121212',
    padding: 24, justifyContent: 'center',
  },
  logoWrap: { alignItems: 'center', marginBottom: 48 },
  logo: { fontSize: 40, fontWeight: '900', color: '#FF6B00' },
  tagline: { color: '#888', fontSize: 14, marginTop: 4 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 8 },
  subtitle: { color: '#888', fontSize: 14, marginBottom: 24 },
  input: {
    backgroundColor: '#1e1e1e', color: '#fff',
    borderRadius: 12, padding: 16, fontSize: 18,
    borderWidth: 1, borderColor: '#333', marginBottom: 16,
  },
  btn: {
    backgroundColor: '#FF6B00', borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  telegramBtn: {
    marginTop: 16, padding: 16,
    borderRadius: 12, borderWidth: 1, borderColor: '#333',
    alignItems: 'center',
  },
  telegramText: { color: '#aaa', fontSize: 15 },
});
```

---

## 5. OTP SCREEN — `src/screens/auth/OtpScreen.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { AuthAPI, TokenStorage } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

export default function OtpScreen({ navigation, route }: any) {
  const { phone } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('Xatolik', '6 xonali kodni kiriting');
      return;
    }
    setLoading(true);
    const res = await AuthAPI.verifySms(phone, code);
    setLoading(false);

    if (!res.success) {
      Alert.alert('Xatolik', res.error);
      return;
    }

    await TokenStorage.save(res.data.accessToken, res.data.refreshToken);

    if (res.data.isNewUser || !res.data.user.profileCompleted) {
      setUser(res.data.user);
      navigation.replace('CompleteProfile');
    } else {
      setUser(res.data.user);
      // Navigator avtomatik asosiy ekranga o'tadi
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    const res = await AuthAPI.sendSms(phone);
    if (res.success) {
      setResendTimer(60);
      Alert.alert('✅', 'Yangi kod yuborildi');
    } else {
      Alert.alert('Xatolik', res.error);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Orqaga</Text>
      </TouchableOpacity>

      <Text style={styles.title}>SMS kodni kiriting</Text>
      <Text style={styles.subtitle}>{phone} ga yuborilgan 6 xonali kod</Text>

      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="• • • • • •"
        placeholderTextColor="#444"
        textAlign="center"
        fontSize={28}
        letterSpacing={8}
        autoFocus
      />

      <TouchableOpacity
        style={[styles.btn, (loading || code.length !== 6) && styles.btnDisabled]}
        onPress={handleVerify}
        disabled={loading || code.length !== 6}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Tasdiqlash</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resendBtn}
        onPress={handleResend}
        disabled={resendTimer > 0}
      >
        <Text style={[styles.resendText, resendTimer > 0 && { color: '#555' }]}>
          {resendTimer > 0 ? `Qayta yuborish (${resendTimer}s)` : 'Qayta yuborish'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 24, paddingTop: 60 },
  back: { marginBottom: 32 },
  backText: { color: '#FF6B00', fontSize: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 8 },
  subtitle: { color: '#888', fontSize: 14, marginBottom: 32 },
  input: {
    backgroundColor: '#1e1e1e', color: '#fff',
    borderRadius: 12, padding: 20,
    borderWidth: 1, borderColor: '#333', marginBottom: 24,
  },
  btn: {
    backgroundColor: '#FF6B00', borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendBtn: { marginTop: 16, alignItems: 'center' },
  resendText: { color: '#FF6B00', fontSize: 15 },
});
```

---

## 6. TELEGRAM SCREEN — `src/screens/auth/TelegramScreen.tsx`

```typescript
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Linking
} from 'react-native';
import { AuthAPI, TokenStorage } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

export default function TelegramScreen({ navigation }: any) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);

  const openBot = () => Linking.openURL('https://t.me/uzfitboom_bot');

  const handleVerify = async () => {
    if (code.length < 6) {
      Alert.alert('Xatolik', "Kodni to'liq kiriting");
      return;
    }
    setLoading(true);
    const res = await AuthAPI.verifyTelegram(code.toUpperCase());
    setLoading(false);

    if (!res.success) {
      Alert.alert('Xatolik', res.error);
      return;
    }

    await TokenStorage.save(res.data.accessToken, res.data.refreshToken);

    if (res.data.isNewUser || !res.data.user.profileCompleted) {
      setUser(res.data.user);
      navigation.replace('CompleteProfile');
    } else {
      setUser(res.data.user);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Orqaga</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Telegram orqali kirish</Text>

      <View style={styles.steps}>
        <Text style={styles.step}>1️⃣  @uzfitboom_bot botini oching</Text>
        <Text style={styles.step}>2️⃣  /start yozing</Text>
        <Text style={styles.step}>3️⃣  Bot bergan kodni quyida kiriting</Text>
      </View>

      <TouchableOpacity style={styles.openBot} onPress={openBot}>
        <Text style={styles.openBotText}>📱 Botni Ochish</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        placeholder="AB12CD34"
        placeholderTextColor="#444"
        autoCapitalize="characters"
        textAlign="center"
        fontSize={24}
        letterSpacing={4}
        maxLength={8}
      />

      <TouchableOpacity
        style={[styles.btn, (loading || code.length < 6) && styles.btnDisabled]}
        onPress={handleVerify}
        disabled={loading || code.length < 6}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Tasdiqlash</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 24, paddingTop: 60 },
  back: { marginBottom: 32 },
  backText: { color: '#FF6B00', fontSize: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 24 },
  steps: { backgroundColor: '#1e1e1e', borderRadius: 12, padding: 16, marginBottom: 16 },
  step: { color: '#ccc', fontSize: 15, marginBottom: 8, lineHeight: 22 },
  openBot: {
    backgroundColor: '#0088cc', borderRadius: 12,
    padding: 14, alignItems: 'center', marginBottom: 24,
  },
  openBotText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  input: {
    backgroundColor: '#1e1e1e', color: '#fff',
    borderRadius: 12, padding: 18,
    borderWidth: 1, borderColor: '#333', marginBottom: 16,
  },
  btn: {
    backgroundColor: '#FF6B00', borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
```

---

## 7. COMPLETE PROFILE SCREEN — `src/screens/auth/CompleteProfileScreen.tsx`

```typescript
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { AuthAPI } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

export default function CompleteProfileScreen() {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Erkak' | 'Ayol' | null>(null);
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);

  const handleSubmit = async () => {
    if (!name.trim() || name.trim().length < 2) {
      Alert.alert('Xatolik', "Ism kamida 2 harf bo'lishi kerak");
      return;
    }
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 10 || ageNum > 100) {
      Alert.alert('Xatolik', "Yosh 10 dan 100 gacha bo'lishi kerak");
      return;
    }
    if (!gender) {
      Alert.alert('Xatolik', "Jinsni tanlang");
      return;
    }

    setLoading(true);
    const res = await AuthAPI.completeProfile(name.trim(), ageNum, gender);
    setLoading(false);

    if (!res.success) {
      Alert.alert('Xatolik', res.error);
      return;
    }

    setUser(res.data.user);
    // Navigator avtomatik asosiy ekranga o'tadi (profileCompleted = true)
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profilingizni to'ldiring</Text>
      <Text style={styles.subtitle}>Bu ma'lumotlar bir martadan kiritiladi</Text>

      {/* Ism */}
      <Text style={styles.label}>Ism Familiya</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Masalan: Ali Valiyev"
        placeholderTextColor="#555"
      />

      {/* Yosh */}
      <Text style={styles.label}>Yosh</Text>
      <TextInput
        style={styles.input}
        value={age}
        onChangeText={setAge}
        keyboardType="number-pad"
        placeholder="Masalan: 25"
        placeholderTextColor="#555"
        maxLength={3}
      />

      {/* Jins */}
      <Text style={styles.label}>Jins</Text>
      <View style={styles.genderRow}>
        <TouchableOpacity
          style={[styles.genderBtn, gender === 'Erkak' && styles.genderActive]}
          onPress={() => setGender('Erkak')}
        >
          <Text style={[styles.genderText, gender === 'Erkak' && styles.genderTextActive]}>
            👨 Erkak
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.genderBtn, gender === 'Ayol' && styles.genderActive]}
          onPress={() => setGender('Ayol')}
        >
          <Text style={[styles.genderText, gender === 'Ayol' && styles.genderTextActive]}>
            👩 Ayol
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Saqlash</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 24, paddingTop: 80 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 8 },
  subtitle: { color: '#888', fontSize: 14, marginBottom: 32 },
  label: { color: '#aaa', fontSize: 13, marginBottom: 8, textTransform: 'uppercase' },
  input: {
    backgroundColor: '#1e1e1e', color: '#fff',
    borderRadius: 12, padding: 16, fontSize: 16,
    borderWidth: 1, borderColor: '#333', marginBottom: 20,
  },
  genderRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  genderBtn: {
    flex: 1, padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#333',
    alignItems: 'center', backgroundColor: '#1e1e1e',
  },
  genderActive: { borderColor: '#FF6B00', backgroundColor: '#2a1800' },
  genderText: { color: '#888', fontSize: 16, fontWeight: '600' },
  genderTextActive: { color: '#FF6B00' },
  btn: {
    backgroundColor: '#FF6B00', borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
```

---

## 8. GYMS SCREEN — `src/screens/gyms/GymsScreen.tsx`

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Image, ActivityIndicator, RefreshControl
} from 'react-native';
import * as Location from 'expo-location';
import { GymsAPI, Gym } from '../../api/client';

const CATEGORIES = ['Hammasi', 'Fitness', 'Yoga', 'Boxing', 'Swimming', 'Crossfit'];

export default function GymsScreen({ navigation }: any) {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Hammasi');
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    })();
  }, []);

  const fetchGyms = useCallback(async () => {
    const res = await GymsAPI.list({
      category: category !== 'Hammasi' ? category : undefined,
      search: search || undefined,
      lat: userLoc?.lat,
      lng: userLoc?.lng,
    });
    if (res.success) setGyms(res.data.gyms);
  }, [category, search, userLoc]);

  useEffect(() => {
    setLoading(true);
    fetchGyms().finally(() => setLoading(false));
  }, [fetchGyms]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGyms();
    setRefreshing(false);
  };

  const renderGym = ({ item }: { item: Gym }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('GymDetail', { gymId: item.id })}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName}>{item.name}</Text>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>
              ⭐ {item.avgRating?.toFixed(1) ?? item.rating}
            </Text>
          </View>
        </View>
        <Text style={styles.cardAddress}>{item.address}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardCredits}>💎 {item.credits} kredit</Text>
          {item.distanceKm !== null && (
            <Text style={styles.cardDistance}>{item.distanceKm} km</Text>
          )}
          <Text style={styles.cardHours}>🕐 {item.hours}</Text>
        </View>
        <View style={styles.categoriesList}>
          {item.categories.slice(0, 3).map((c) => (
            <View key={c} style={styles.catChip}>
              <Text style={styles.catText}>{c}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sport Zallar</Text>
        <Text style={styles.headerCount}>{gyms.length} ta zal</Text>
      </View>

      {/* Qidiruv */}
      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Zal nomi yoki manzil..."
        placeholderTextColor="#555"
      />

      {/* Kategoriyalar */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(i) => i}
        showsHorizontalScrollIndicator={false}
        style={styles.cats}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.catBtn, category === item && styles.catBtnActive]}
            onPress={() => setCategory(item)}
          >
            <Text style={[styles.catBtnText, category === item && styles.catBtnTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <ActivityIndicator color="#FF6B00" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={gyms}
          keyExtractor={(g) => g.id}
          renderItem={renderGym}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B00" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Hech qanday zal topilmadi</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 50 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerCount: { color: '#888', fontSize: 14 },
  search: {
    backgroundColor: '#1e1e1e', color: '#fff',
    margin: 16, marginTop: 0, borderRadius: 10,
    padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#333',
  },
  cats: { paddingHorizontal: 16, marginBottom: 8, maxHeight: 44 },
  catBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#1e1e1e',
    marginRight: 8, borderWidth: 1, borderColor: '#333',
  },
  catBtnActive: { backgroundColor: '#FF6B00', borderColor: '#FF6B00' },
  catBtnText: { color: '#888', fontSize: 13, fontWeight: '600' },
  catBtnTextActive: { color: '#fff' },
  list: { padding: 16, paddingTop: 4 },
  card: {
    backgroundColor: '#1e1e1e', borderRadius: 16,
    marginBottom: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  cardImage: { width: '100%', height: 180, backgroundColor: '#333' },
  cardBody: { padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardName: { fontSize: 17, fontWeight: '700', color: '#fff', flex: 1 },
  ratingBadge: { backgroundColor: '#2a2a00', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  ratingText: { color: '#FFD700', fontSize: 13, fontWeight: '600' },
  cardAddress: { color: '#888', fontSize: 13, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  cardCredits: { color: '#FF6B00', fontWeight: '700', fontSize: 14 },
  cardDistance: { color: '#4CAF50', fontSize: 13 },
  cardHours: { color: '#888', fontSize: 13 },
  categoriesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catChip: { backgroundColor: '#2a2a2a', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  catText: { color: '#aaa', fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#555', fontSize: 16 },
});
```

---

## 9. GYM DETAIL SCREEN — `src/screens/gyms/GymDetailScreen.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Dimensions, FlatList
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { GymsAPI, Gym, TimeSlot } from '../../api/client';

const { width } = Dimensions.get('window');

export default function GymDetailScreen({ navigation, route }: any) {
  const { gymId } = route.params;
  const [gym, setGym] = useState<Gym | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'map'>('info');

  useEffect(() => {
    (async () => {
      const res = await GymsAPI.detail(gymId);
      if (res.success) setGym(res.data.gym);
      setLoading(false);
    })();
  }, [gymId]);

  if (loading) return <ActivityIndicator color="#FF6B00" style={{ flex: 1, backgroundColor: '#121212' }} />;
  if (!gym) return (
    <View style={styles.error}>
      <Text style={styles.errorText}>Zal topilmadi</Text>
    </View>
  );

  const lat = gym.latitude ? parseFloat(gym.latitude) : null;
  const lng = gym.longitude ? parseFloat(gym.longitude) : null;

  return (
    <View style={styles.container}>
      {/* Scroll sarlavha rasm */}
      <ScrollView>
        {/* Rasmlar */}
        <FlatList
          horizontal
          pagingEnabled
          data={[gym.imageUrl, ...gym.images].filter(Boolean)}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={styles.image} />
          )}
          showsHorizontalScrollIndicator={false}
        />

        {/* Orqaga tugma */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>

        <View style={styles.body}>
          {/* Asosiy info */}
          <View style={styles.infoRow}>
            <View>
              <Text style={styles.name}>{gym.name}</Text>
              <Text style={styles.address}>{gym.address}</Text>
            </View>
            <View style={styles.creditsBadge}>
              <Text style={styles.creditsValue}>{gym.credits}</Text>
              <Text style={styles.creditsLabel}>kredit</Text>
            </View>
          </View>

          {/* Reyting + ishlash vaqti */}
          <View style={styles.metaRow}>
            <Text style={styles.meta}>⭐ {gym.avgRating?.toFixed(1) ?? gym.rating} ({gym.ratingCount} baho)</Text>
            <Text style={styles.meta}>🕐 {gym.hours}</Text>
          </View>

          {/* Kategoriyalar */}
          <View style={styles.chips}>
            {gym.categories.map((c) => (
              <View key={c} style={styles.chip}>
                <Text style={styles.chipText}>{c}</Text>
              </View>
            ))}
          </View>

          {/* Tavsif */}
          {gym.description && (
            <Text style={styles.description}>{gym.description}</Text>
          )}

          {/* Imkoniyatlar */}
          {gym.facilities && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Imkoniyatlar</Text>
              <Text style={styles.facilities}>{gym.facilities}</Text>
            </View>
          )}

          {/* Tabs: Info / Xarita */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'info' && styles.tabActive]}
              onPress={() => setActiveTab('info')}
            >
              <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>
                Ma'lumot
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'map' && styles.tabActive]}
              onPress={() => setActiveTab('map')}
            >
              <Text style={[styles.tabText, activeTab === 'map' && styles.tabTextActive]}>
                Xarita
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'map' && lat && lng ? (
            <MapView
              style={styles.map}
              initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
            >
              <Marker
                coordinate={{ latitude: lat, longitude: lng }}
                title={gym.name}
                description={gym.address}
                pinColor="#FF6B00"
              />
            </MapView>
          ) : activeTab === 'map' ? (
            <View style={styles.noMap}>
              <Text style={styles.noMapText}>Xarita koordinatalari mavjud emas</Text>
            </View>
          ) : null}

          {/* Yopiq kunlar */}
          {gym.closedDays.length > 0 && (
            <View style={styles.closedSection}>
              <Text style={styles.closedTitle}>⛔ Yopiq kunlar</Text>
              <Text style={styles.closedText}>
                {gym.closedDays.map(d => ['Yakshanba','Dushanba','Seshanba','Chorshanba','Payshanba','Juma','Shanba'][parseInt(d)]).join(', ')}
              </Text>
            </View>
          )}

          {/* Spacer */}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bron qilish tugmasi */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => navigation.navigate('Booking', { gymId: gym.id, gymName: gym.name, gymCredits: gym.credits })}
        >
          <Text style={styles.bookBtnText}>Bron Qilish — {gym.credits} kredit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  error: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#888', fontSize: 16 },
  image: { width, height: 260, backgroundColor: '#333' },
  backBtn: {
    position: 'absolute', top: 50, left: 16,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20,
    width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
  },
  backBtnText: { color: '#fff', fontSize: 18 },
  body: { padding: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  name: { fontSize: 22, fontWeight: '800', color: '#fff', flex: 1, marginRight: 12 },
  address: { color: '#888', fontSize: 14, marginTop: 4 },
  creditsBadge: {
    backgroundColor: '#2a1800', borderRadius: 12,
    padding: 12, alignItems: 'center', minWidth: 70,
  },
  creditsValue: { color: '#FF6B00', fontSize: 24, fontWeight: '900' },
  creditsLabel: { color: '#FF6B00', fontSize: 12 },
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  meta: { color: '#aaa', fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { backgroundColor: '#2a2a2a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { color: '#ccc', fontSize: 13 },
  description: { color: '#bbb', fontSize: 15, lineHeight: 22, marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  facilities: { color: '#aaa', fontSize: 14, lineHeight: 20 },
  tabs: { flexDirection: 'row', backgroundColor: '#1e1e1e', borderRadius: 10, marginBottom: 16, padding: 4 },
  tab: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#FF6B00' },
  tabText: { color: '#888', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  map: { width: '100%', height: 200, borderRadius: 12, marginBottom: 20 },
  noMap: { backgroundColor: '#1e1e1e', borderRadius: 12, padding: 24, alignItems: 'center', marginBottom: 20 },
  noMapText: { color: '#555' },
  closedSection: { backgroundColor: '#1a0000', borderRadius: 10, padding: 12, marginBottom: 16 },
  closedTitle: { color: '#ff6666', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  closedText: { color: '#cc4444', fontSize: 13 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: '#121212',
    borderTopWidth: 1, borderTopColor: '#2a2a2a',
  },
  bookBtn: {
    backgroundColor: '#FF6B00', borderRadius: 14,
    padding: 16, alignItems: 'center',
  },
  bookBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
```

---

## 10. BOOKING SCREEN — `src/screens/gyms/BookingScreen.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, FlatList
} from 'react-native';
import { GymsAPI, BookingsAPI, TimeSlot } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getNext7Days(): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
}

const DAY_NAMES = ['Yak', 'Dush', 'Ses', 'Chor', 'Pay', 'Jum', 'Shan'];
const MONTH_NAMES = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

export default function BookingScreen({ navigation, route }: any) {
  const { gymId, gymName, gymCredits } = route.params;
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const days = getNext7Days();
  const [selectedDate, setSelectedDate] = useState(days[0]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    (async () => {
      setSlotsLoading(true);
      setSelectedSlot(null);
      const res = await GymsAPI.slots(gymId, formatDate(selectedDate));
      setSlotsLoading(false);
      if (res.success) {
        setIsClosed(res.data.isClosed);
        setSlots(res.data.slots);
      }
    })();
  }, [selectedDate, gymId]);

  const handleBook = async () => {
    if (!selectedSlot) return;
    if ((user?.credits ?? 0) < gymCredits) {
      Alert.alert('Kredit yetarli emas',
        `Sizda ${user?.credits ?? 0} kredit bor. ${gymCredits} kredit kerak.`,
        [
          { text: 'Bekor', style: 'cancel' },
          { text: 'Kredit olish', onPress: () => navigation.navigate('Credits') },
        ]
      );
      return;
    }

    Alert.alert('Bronni tasdiqlang',
      `${gymName}\n${formatDate(selectedDate)}\n${selectedSlot.startTime} - ${selectedSlot.endTime}\n\n${gymCredits} kredit sarflanadi`,
      [
        { text: 'Bekor', style: 'cancel' },
        {
          text: 'Bron qilish',
          onPress: async () => {
            setBooking(true);
            const res = await BookingsAPI.create(gymId, selectedSlot.id, formatDate(selectedDate));
            setBooking(false);
            if (!res.success) {
              Alert.alert('Xatolik', res.error);
              return;
            }
            Alert.alert('✅ Muvaffaqiyat',
              `Bron qilindi! ${res.data.remainingCredits} kredit qoldi.`,
              [{ text: 'OK', onPress: () => navigation.navigate('Bookings') }]
            );
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{gymName}</Text>
        <View style={styles.creditsInfo}>
          <Text style={styles.creditsText}>💎 {user?.credits ?? 0}</Text>
        </View>
      </View>

      <ScrollView>
        {/* Sana tanlash */}
        <Text style={styles.sectionTitle}>Sana tanlang</Text>
        <FlatList
          horizontal
          data={days}
          keyExtractor={(d) => d.toISOString()}
          showsHorizontalScrollIndicator={false}
          style={styles.dayList}
          renderItem={({ item }) => {
            const isSelected = formatDate(item) === formatDate(selectedDate);
            return (
              <TouchableOpacity
                style={[styles.dayBtn, isSelected && styles.dayBtnActive]}
                onPress={() => setSelectedDate(item)}
              >
                <Text style={[styles.dayName, isSelected && styles.dayTextActive]}>
                  {DAY_NAMES[item.getDay()]}
                </Text>
                <Text style={[styles.dayNum, isSelected && styles.dayTextActive]}>
                  {item.getDate()}
                </Text>
                <Text style={[styles.dayMonth, isSelected && styles.dayTextActive]}>
                  {MONTH_NAMES[item.getMonth()]}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        {/* Vaqt slotlari */}
        <Text style={styles.sectionTitle}>Vaqt tanlang</Text>
        {slotsLoading ? (
          <ActivityIndicator color="#FF6B00" style={{ marginTop: 20 }} />
        ) : isClosed ? (
          <View style={styles.closedBox}>
            <Text style={styles.closedText}>⛔ Bu kun sport zal yopiq</Text>
          </View>
        ) : slots.length === 0 ? (
          <View style={styles.closedBox}>
            <Text style={styles.closedText}>Bu kun uchun vaqt sloti yo'q</Text>
          </View>
        ) : (
          <View style={styles.slotsGrid}>
            {slots.map((slot) => (
              <TouchableOpacity
                key={slot.id}
                style={[
                  styles.slotBtn,
                  !slot.isAvailable && styles.slotDisabled,
                  selectedSlot?.id === slot.id && styles.slotActive,
                ]}
                onPress={() => slot.isAvailable && setSelectedSlot(slot)}
                disabled={!slot.isAvailable}
              >
                <Text style={[
                  styles.slotTime,
                  !slot.isAvailable && styles.slotTimeDisabled,
                  selectedSlot?.id === slot.id && styles.slotTimeActive,
                ]}>
                  {slot.startTime}
                </Text>
                <Text style={[styles.slotEnd, !slot.isAvailable && styles.slotTimeDisabled]}>
                  - {slot.endTime}
                </Text>
                <Text style={styles.slotSpots}>
                  {slot.isAvailable ? `${slot.availableSpots} joy` : 'To\'liq'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bron tugmasi */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.bookBtn, (!selectedSlot || booking) && styles.bookBtnDisabled]}
          onPress={handleBook}
          disabled={!selectedSlot || booking}
        >
          {booking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.bookBtnText}>
              {selectedSlot
                ? `${selectedSlot.startTime} - ${selectedSlot.endTime} | ${gymCredits} kredit`
                : 'Vaqt tanlang'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#2a2a2a',
  },
  back: { color: '#FF6B00', fontSize: 22, marginRight: 12 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700' },
  creditsInfo: { backgroundColor: '#2a1800', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  creditsText: { color: '#FF6B00', fontWeight: '700' },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', margin: 16, marginBottom: 8 },
  dayList: { paddingHorizontal: 16, marginBottom: 8 },
  dayBtn: {
    width: 60, marginRight: 8, borderRadius: 12,
    backgroundColor: '#1e1e1e', alignItems: 'center', padding: 10,
    borderWidth: 1, borderColor: '#333',
  },
  dayBtnActive: { backgroundColor: '#FF6B00', borderColor: '#FF6B00' },
  dayName: { color: '#888', fontSize: 11, fontWeight: '600' },
  dayNum: { color: '#fff', fontSize: 20, fontWeight: '800', marginVertical: 2 },
  dayMonth: { color: '#888', fontSize: 11 },
  dayTextActive: { color: '#fff' },
  closedBox: { backgroundColor: '#1a0000', margin: 16, borderRadius: 12, padding: 20, alignItems: 'center' },
  closedText: { color: '#cc4444', fontSize: 15 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 10 },
  slotBtn: {
    width: '30%', backgroundColor: '#1e1e1e', borderRadius: 12,
    padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333',
  },
  slotDisabled: { opacity: 0.4 },
  slotActive: { backgroundColor: '#2a1800', borderColor: '#FF6B00' },
  slotTime: { color: '#fff', fontWeight: '700', fontSize: 16 },
  slotEnd: { color: '#888', fontSize: 12 },
  slotTimeDisabled: { color: '#555' },
  slotTimeActive: { color: '#FF6B00' },
  slotSpots: { color: '#4CAF50', fontSize: 11, marginTop: 4 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: '#121212',
    borderTopWidth: 1, borderTopColor: '#2a2a2a',
  },
  bookBtn: { backgroundColor: '#FF6B00', borderRadius: 14, padding: 16, alignItems: 'center' },
  bookBtnDisabled: { opacity: 0.4 },
  bookBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
```

---

## 11. QR SCANNER SCREEN — `src/screens/qr/QrScannerScreen.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { BookingsAPI } from '../../api/client';

export default function QrScannerScreen({ navigation }: any) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted');
    });
  }, []);

  const handleScan = async ({ data }: { data: string }) => {
    if (scanned || verifying) return;
    setScanned(true);
    setVerifying(true);

    const res = await BookingsAPI.verifyQr(data);
    setVerifying(false);

    if (res.success) {
      Alert.alert(
        '✅ Kirish Tasdiqlandi!',
        `${res.data.message}\n\nBron yakunlandi va tashrif qayd etildi.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } else {
      Alert.alert(
        '❌ Xatolik',
        res.error,
        [
          { text: 'Qayta urinish', onPress: () => setScanned(false) },
          { text: 'Ortga', onPress: () => navigation.goBack() },
        ]
      );
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FF6B00" />
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Kamera ruxsati berilmagan</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Ortga</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleScan}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        <Text style={styles.title}>QR Kodni Skanerlang</Text>
        <Text style={styles.subtitle}>Sport zalga kirish uchun QR kodingizni ko'rsating</Text>

        {/* Skaner oynasi */}
        <View style={styles.scanWindow} />

        {verifying && (
          <View style={styles.verifyBox}>
            <ActivityIndicator color="#FF6B00" />
            <Text style={styles.verifyText}>Tekshirilmoqda...</Text>
          </View>
        )}

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Bekor qilish</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#fff', fontSize: 16, marginBottom: 20 },
  btn: { backgroundColor: '#FF6B00', padding: 14, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '700' },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between', alignItems: 'center',
    padding: 24, paddingTop: 80,
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: '#ccc', fontSize: 14, textAlign: 'center' },
  scanWindow: {
    width: 260, height: 260,
    borderWidth: 2, borderColor: '#FF6B00',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  verifyBox: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#1e1e1e', padding: 16, borderRadius: 12 },
  verifyText: { color: '#fff', fontSize: 15 },
  cancelBtn: { backgroundColor: '#1e1e1e', padding: 14, borderRadius: 12, paddingHorizontal: 32 },
  cancelText: { color: '#fff', fontWeight: '600' },
});
```

---

## 12. BOOKINGS SCREEN — `src/screens/bookings/BookingsScreen.tsx`

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { BookingsAPI, Booking } from '../../api/client';
import { useFocusEffect } from '@react-navigation/native';

const STATUS_TABS = [
  { key: undefined, label: 'Barchasi' },
  { key: 'pending', label: 'Kutilayotgan' },
  { key: 'completed', label: 'Yakunlangan' },
  { key: 'missed', label: 'O\'tkazib yuborilgan' },
  { key: 'cancelled', label: 'Bekor qilingan' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: '#FF6B00',
  completed: '#4CAF50',
  missed: '#ff4444',
  cancelled: '#888',
};

export default function BookingsScreen({ navigation }: any) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<string | undefined>(undefined);

  const fetchBookings = useCallback(async () => {
    const res = await BookingsAPI.list(status as any);
    if (res.success) setBookings(res.data.bookings);
  }, [status]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchBookings().finally(() => setLoading(false));
    }, [fetchBookings])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  };

  const renderBooking = ({ item }: { item: Booking }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
    >
      <View style={styles.cardLeft}>
        <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] ?? '#888' }]} />
        <View>
          <Text style={styles.cardDate}>{item.date} — {item.scheduledStartTime ?? item.time}</Text>
          <Text style={styles.cardStatus}>{
            { pending: 'Kutilayotgan', completed: 'Yakunlangan', missed: "O'tkazib yuborilgan", cancelled: 'Bekor qilingan' }[item.status]
          }</Text>
        </View>
      </View>
      <Text style={styles.cardArrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bronlarim</Text>
        <TouchableOpacity
          style={styles.qrBtn}
          onPress={() => navigation.navigate('QrScanner')}
        >
          <Text style={styles.qrText}>📷 QR</Text>
        </TouchableOpacity>
      </View>

      {/* Status filtrlari */}
      <FlatList
        horizontal
        data={STATUS_TABS}
        keyExtractor={(i) => String(i.key)}
        showsHorizontalScrollIndicator={false}
        style={styles.tabs}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.tab, status === item.key && styles.tabActive]}
            onPress={() => setStatus(item.key as any)}
          >
            <Text style={[styles.tabText, status === item.key && styles.tabTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <ActivityIndicator color="#FF6B00" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => b.id}
          renderItem={renderBooking}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B00" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Bronlar topilmadi</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 16, paddingTop: 50,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  qrBtn: { backgroundColor: '#1e1e1e', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#333' },
  qrText: { color: '#fff', fontWeight: '600' },
  tabs: { paddingHorizontal: 16, marginBottom: 8, maxHeight: 44 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#1e1e1e',
    marginRight: 8, borderWidth: 1, borderColor: '#333',
  },
  tabActive: { backgroundColor: '#FF6B00', borderColor: '#FF6B00' },
  tabText: { color: '#888', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#1e1e1e', borderRadius: 14,
    padding: 16, marginBottom: 10, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  cardDate: { color: '#fff', fontWeight: '600', fontSize: 15 },
  cardStatus: { color: '#888', fontSize: 13, marginTop: 2 },
  cardArrow: { color: '#555', fontSize: 20 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#555', fontSize: 16 },
});
```

---

## 13. CREDITS SCREEN — `src/screens/credits/CreditsScreen.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CreditsAPI, CreditPackage } from '../../api/client';

export default function CreditsScreen() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CreditPackage | null>(null);
  const [receipt, setReceipt] = useState<{ uri: string; mimeType: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await CreditsAPI.status();
      if (res.success) setData(res.data);
      setLoading(false);
    })();
  }, []);

  const pickReceipt = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setReceipt({ uri: asset.uri, mimeType: asset.mimeType || 'image/jpeg' });
    }
  };

  const handleSubmit = async () => {
    if (!selected || !receipt) {
      Alert.alert('Xatolik', "Paket va to'lov chekini tanlang");
      return;
    }
    setSubmitting(true);
    const res = await CreditsAPI.purchase(selected.credits, selected.price, receipt.uri, receipt.mimeType);
    setSubmitting(false);

    if (!res.success) {
      Alert.alert('Xatolik', res.error);
      return;
    }

    Alert.alert('✅ Chek yuborildi',
      "Admin ko'rib chiqadi va kreditlar tez orada qo'shiladi.",
      [{ text: 'OK', onPress: () => { setSelected(null); setReceipt(null); } }]
    );
  };

  if (loading) return <ActivityIndicator color="#FF6B00" style={{ flex: 1, backgroundColor: '#121212' }} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Kredit Sotib Olish</Text>

      {/* Joriy balans */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Joriy balansingiz</Text>
        <Text style={styles.balanceValue}>{data?.credits ?? 0}</Text>
        <Text style={styles.balanceSub}>kredit</Text>
        {data?.creditExpiryDate && (
          <Text style={styles.expiry}>
            Muddat: {new Date(data.creditExpiryDate).toLocaleDateString('uz')}
            {data.daysUntilExpiry !== null && ` (${data.daysUntilExpiry} kun)`}
          </Text>
        )}
      </View>

      {/* Paketlar */}
      <Text style={styles.sectionTitle}>Paket tanlang</Text>
      <View style={styles.packages}>
        {(data?.packages || []).map((pkg: CreditPackage) => (
          <TouchableOpacity
            key={pkg.credits}
            style={[styles.pkgCard, selected?.credits === pkg.credits && styles.pkgActive]}
            onPress={() => setSelected(pkg)}
          >
            <Text style={styles.pkgCredits}>{pkg.credits}</Text>
            <Text style={styles.pkgLabel}>kredit</Text>
            <Text style={[styles.pkgPrice, selected?.credits === pkg.credits && styles.pkgPriceActive]}>
              {pkg.priceFormatted}
            </Text>
            {pkg.credits === 130 && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>Mashhur</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* To'lov ko'rsatmalari */}
      {selected && (
        <View style={styles.instructionBox}>
          <Text style={styles.instructionTitle}>📲 To'lov ko'rsatmalari</Text>
          <Text style={styles.instructionText}>
            1. Quyidagi raqamga {selected.priceFormatted} o'tkazing:{'\n'}
            📱 Click/Payme: +998 90 123 45 67{'\n\n'}
            2. To'lov chekini saqlang{'\n'}
            3. Quyida chekni yuklang va "Yuborish" ni bosing
          </Text>
        </View>
      )}

      {/* Chek yuklash */}
      {selected && (
        <>
          <TouchableOpacity style={styles.receiptBtn} onPress={pickReceipt}>
            {receipt ? (
              <Image source={{ uri: receipt.uri }} style={styles.receiptPreview} />
            ) : (
              <Text style={styles.receiptBtnText}>📎 To'lov chekini yuklang</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitBtn, (!receipt || submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!receipt || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>
                {selected.credits} kredit uchun chek yuborish
              </Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {/* Kutilayotgan to'lovlar */}
      {(data?.pendingPaymentsCount ?? 0) > 0 && (
        <View style={styles.pendingBox}>
          <Text style={styles.pendingText}>
            ⏳ {data.pendingPaymentsCount} ta to'lov admin tasdiqlashini kutmoqda
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 20, paddingTop: 50 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 24 },
  balanceCard: {
    backgroundColor: '#1e1e1e', borderRadius: 20,
    padding: 24, alignItems: 'center', marginBottom: 28,
    borderWidth: 1, borderColor: '#FF6B00',
  },
  balanceLabel: { color: '#888', fontSize: 14, marginBottom: 4 },
  balanceValue: { fontSize: 56, fontWeight: '900', color: '#FF6B00' },
  balanceSub: { color: '#888', fontSize: 16 },
  expiry: { color: '#888', fontSize: 12, marginTop: 8 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  packages: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  pkgCard: {
    flex: 1, backgroundColor: '#1e1e1e', borderRadius: 14,
    padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#333',
    position: 'relative',
  },
  pkgActive: { borderColor: '#FF6B00', backgroundColor: '#2a1800' },
  pkgCredits: { fontSize: 28, fontWeight: '900', color: '#fff' },
  pkgLabel: { color: '#888', fontSize: 12 },
  pkgPrice: { color: '#aaa', fontSize: 12, marginTop: 4, textAlign: 'center' },
  pkgPriceActive: { color: '#FF6B00' },
  popularBadge: {
    position: 'absolute', top: -8, right: -8,
    backgroundColor: '#FF6B00', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  popularText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  instructionBox: { backgroundColor: '#1a1a00', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#333300' },
  instructionTitle: { color: '#FFD700', fontWeight: '700', fontSize: 15, marginBottom: 8 },
  instructionText: { color: '#bbb', fontSize: 13, lineHeight: 20 },
  receiptBtn: {
    backgroundColor: '#1e1e1e', borderRadius: 14, borderWidth: 1,
    borderColor: '#333', borderStyle: 'dashed', height: 120,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  receiptPreview: { width: '100%', height: 120, borderRadius: 14 },
  receiptBtnText: { color: '#888', fontSize: 15 },
  submitBtn: {
    backgroundColor: '#FF6B00', borderRadius: 14,
    padding: 16, alignItems: 'center', marginBottom: 20,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  pendingBox: { backgroundColor: '#1a1a00', borderRadius: 12, padding: 14, alignItems: 'center' },
  pendingText: { color: '#FFD700', fontSize: 14 },
});
```

---

## 14. COLLECTIONS SCREEN — `src/screens/collections/CollectionsScreen.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, RefreshControl
} from 'react-native';
import { CollectionsAPI, Collection } from '../../api/client';

export default function CollectionsScreen({ navigation }: any) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCollections = async () => {
    const res = await CollectionsAPI.list();
    if (res.success) setCollections(res.data.collections);
  };

  useEffect(() => {
    setLoading(true);
    fetchCollections().finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCollections();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: Collection }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('CollectionDetail', { collectionId: item.id })}
    >
      <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardName}>{item.name}</Text>
          {item.isFree ? (
            <View style={styles.freeBadge}><Text style={styles.freeText}>Bepul</Text></View>
          ) : item.isPurchased ? (
            <View style={styles.purchasedBadge}><Text style={styles.purchasedText}>✅ Sotib olingan</Text></View>
          ) : (
            <View style={styles.priceBadge}><Text style={styles.priceText}>{item.price} kredit</Text></View>
          )}
        </View>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        <Text style={styles.cardCount}>{item.classCount} ta video dars</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Video Kurslar</Text>
      {loading ? (
        <ActivityIndicator color="#FF6B00" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={collections}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B00" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Kurslar hali mavjud emas</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', padding: 16, paddingTop: 50 },
  list: { padding: 16, paddingTop: 4 },
  card: {
    backgroundColor: '#1e1e1e', borderRadius: 16,
    marginBottom: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  thumbnail: { width: '100%', height: 160, backgroundColor: '#333' },
  cardBody: { padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardName: { fontSize: 17, fontWeight: '700', color: '#fff', flex: 1, marginRight: 8 },
  freeBadge: { backgroundColor: '#1a3300', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  freeText: { color: '#4CAF50', fontWeight: '700', fontSize: 12 },
  purchasedBadge: { backgroundColor: '#001a33', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  purchasedText: { color: '#4da6ff', fontSize: 12, fontWeight: '600' },
  priceBadge: { backgroundColor: '#2a1800', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  priceText: { color: '#FF6B00', fontWeight: '700', fontSize: 12 },
  cardDesc: { color: '#888', fontSize: 13, lineHeight: 18, marginBottom: 8 },
  cardCount: { color: '#666', fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#555', fontSize: 16 },
});
```

---

## 15. COLLECTION DETAIL — `src/screens/collections/CollectionDetailScreen.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { CollectionsAPI, Collection, VideoClass } from '../../api/client';

export default function CollectionDetailScreen({ navigation, route }: any) {
  const { collectionId } = route.params;
  const [collection, setCollection] = useState<Collection | null>(null);
  const [classes, setClasses] = useState<VideoClass[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const fetchData = async () => {
    const res = await CollectionsAPI.detail(collectionId);
    if (res.success) {
      setCollection(res.data.collection);
      setClasses(res.data.classes);
      setHasAccess(res.data.hasAccess);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [collectionId]);

  const handlePurchase = async () => {
    if (!collection) return;
    Alert.alert('Kursni sotib olish',
      `"${collection.name}" kursini ${collection.price} kredit evaziga sotib olasizmi?`,
      [
        { text: 'Bekor', style: 'cancel' },
        {
          text: 'Sotib olish',
          onPress: async () => {
            setPurchasing(true);
            const res = await CollectionsAPI.purchase(collection.id);
            setPurchasing(false);
            if (!res.success) {
              Alert.alert('Xatolik', res.error);
              return;
            }
            Alert.alert('✅ Muvaffaqiyat', res.data.message);
            fetchData();
          },
        },
      ]
    );
  };

  if (loading) return <ActivityIndicator color="#FF6B00" style={{ flex: 1, backgroundColor: '#121212' }} />;
  if (!collection) return null;

  return (
    <View style={styles.container}>
      <ScrollView>
        <Image source={{ uri: collection.thumbnailUrl }} style={styles.thumbnail} />

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <View style={styles.body}>
          <Text style={styles.name}>{collection.name}</Text>
          <Text style={styles.desc}>{collection.description}</Text>
          <Text style={styles.classCount}>{collection.classCount} ta video dars</Text>

          {/* Videolar ro'yxati */}
          <Text style={styles.sectionTitle}>Videolar</Text>
          {classes.map((cls) => (
            <TouchableOpacity
              key={cls.id}
              style={[styles.classCard, cls.isLocked && styles.classCardLocked]}
              onPress={() => {
                if (cls.isLocked) {
                  Alert.alert('🔒 Qulflangan', 'Bu videoga kirish uchun avval kursni sotib oling');
                  return;
                }
                navigation.navigate('VideoPlayer', { classId: cls.id, className: cls.title });
              }}
            >
              <Image source={{ uri: cls.thumbnailUrl }} style={styles.classThumb} />
              <View style={styles.classInfo}>
                <Text style={styles.classTitle}>{cls.orderIndex + 1}. {cls.title}</Text>
                {cls.instructor && <Text style={styles.classInstructor}>🎓 {cls.instructor}</Text>}
                <Text style={styles.classDuration}>⏱ {Math.floor(cls.duration / 60)} daq</Text>
              </View>
              <Text style={styles.classArrow}>{cls.isLocked ? '🔒' : '▶'}</Text>
            </TouchableOpacity>
          ))}

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Sotib olish tugmasi (agar kirish yo'q bo'lsa) */}
      {!hasAccess && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.purchaseBtn, purchasing && styles.purchaseBtnDisabled]}
            onPress={handlePurchase}
            disabled={purchasing}
          >
            {purchasing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.purchaseBtnText}>
                {collection.price} kredit evaziga sotib olish
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  thumbnail: { width: '100%', height: 220, backgroundColor: '#333' },
  backBtn: {
    position: 'absolute', top: 50, left: 16,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20,
    width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
  },
  backText: { color: '#fff', fontSize: 18 },
  body: { padding: 20 },
  name: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8 },
  desc: { color: '#aaa', fontSize: 14, lineHeight: 20, marginBottom: 8 },
  classCount: { color: '#888', fontSize: 13, marginBottom: 20 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  classCard: {
    flexDirection: 'row', backgroundColor: '#1e1e1e',
    borderRadius: 12, marginBottom: 10, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: '#2a2a2a',
  },
  classCardLocked: { opacity: 0.6 },
  classThumb: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#333' },
  classInfo: { flex: 1, marginLeft: 12 },
  classTitle: { color: '#fff', fontWeight: '600', fontSize: 14, marginBottom: 2 },
  classInstructor: { color: '#888', fontSize: 12, marginBottom: 2 },
  classDuration: { color: '#888', fontSize: 12 },
  classArrow: { color: '#FF6B00', fontSize: 18, paddingLeft: 8 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: '#121212',
    borderTopWidth: 1, borderTopColor: '#2a2a2a',
  },
  purchaseBtn: { backgroundColor: '#FF6B00', borderRadius: 14, padding: 16, alignItems: 'center' },
  purchaseBtnDisabled: { opacity: 0.4 },
  purchaseBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
```

---

## 16. VIDEO PLAYER — `src/screens/collections/VideoPlayerScreen.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions
} from 'react-native';
import Video from 'react-native-video';
import { ClassesAPI, VideoClass } from '../../api/client';

const { width } = Dimensions.get('window');

export default function VideoPlayerScreen({ navigation, route }: any) {
  const { classId } = route.params;
  const [cls, setCls] = useState<VideoClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await ClassesAPI.detail(classId);
      if (res.success) setCls(res.data.class);
      setLoading(false);
    })();
  }, [classId]);

  if (loading) return <ActivityIndicator color="#FF6B00" style={{ flex: 1, backgroundColor: '#000' }} />;
  if (!cls || !cls.videoUrl) return (
    <View style={styles.error}>
      <Text style={styles.errorText}>Video yuklanmadi</Text>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.back}>← Orqaga</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Video */}
      <Video
        source={{ uri: cls.videoUrl }}
        style={styles.video}
        resizeMode="contain"
        paused={paused}
        controls={true}
        onError={(e) => console.warn('Video error:', e)}
      />

      {/* Info */}
      <View style={styles.info}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{cls.title}</Text>
        {cls.instructor && <Text style={styles.instructor}>🎓 {cls.instructor}</Text>}
        {cls.description && <Text style={styles.desc}>{cls.description}</Text>}
        <Text style={styles.duration}>⏱ {Math.floor(cls.duration / 60)} daqiqa</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { width, height: width * 0.5625 /* 16:9 */ },
  info: { flex: 1, padding: 20, backgroundColor: '#121212' },
  backBtn: { marginBottom: 16 },
  backText: { color: '#FF6B00', fontSize: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 },
  instructor: { color: '#aaa', fontSize: 14, marginBottom: 6 },
  desc: { color: '#888', fontSize: 14, lineHeight: 20, marginBottom: 8 },
  duration: { color: '#666', fontSize: 13 },
  error: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#888', fontSize: 16, marginBottom: 16 },
  back: { color: '#FF6B00', fontSize: 16 },
});
```

---

## 17. PROFILE SCREEN — `src/screens/profile/ProfileScreen.tsx`

```typescript
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, Image, ScrollView, ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { UserAPI } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

export default function ProfileScreen({ navigation }: any) {
  const { user, setUser, logout } = useAuthStore();
  const [uploading, setUploading] = useState(false);

  const pickAvatar = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (res.canceled || !res.assets[0]) return;

    setUploading(true);
    const asset = res.assets[0];
    const uploadRes = await UserAPI.uploadAvatar(asset.uri, asset.mimeType || 'image/jpeg');
    setUploading(false);

    if (uploadRes.success) {
      setUser(uploadRes.data.user);
      Alert.alert('✅', 'Rasm yangilandi');
    } else {
      Alert.alert('Xatolik', uploadRes.error);
    }
  };

  const handleLogout = () => {
    Alert.alert('Chiqish', "Ilovadan chiqmoqchimisiz?", [
      { text: 'Bekor', style: 'cancel' },
      { text: 'Chiqish', style: 'destructive', onPress: logout },
    ]);
  };

  if (!user) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Profil</Text>

      {/* Avatar */}
      <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} disabled={uploading}>
        {user.profileImageUrl ? (
          <Image source={{ uri: user.profileImageUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {user.name ? user.name[0].toUpperCase() : '?'}
            </Text>
          </View>
        )}
        {uploading && (
          <View style={styles.avatarOverlay}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
        <View style={styles.avatarEdit}>
          <Text style={styles.avatarEditText}>✏️</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.name}>{user.name ?? 'Ism kiritilmagan'}</Text>
      <Text style={styles.phone}>{user.phone ?? user.telegramId ?? ''}</Text>

      {/* Kredit */}
      <View style={styles.creditsCard}>
        <View>
          <Text style={styles.creditsLabel}>Kredit balansi</Text>
          <Text style={styles.creditsValue}>{user.credits} kredit</Text>
        </View>
        <TouchableOpacity
          style={styles.topUpBtn}
          onPress={() => navigation.navigate('Credits')}
        >
          <Text style={styles.topUpText}>+ To'ldirish</Text>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.infoCard}>
        <InfoRow label="Yosh" value={user.age ? `${user.age} yosh` : '—'} />
        <InfoRow label="Jins" value={user.gender ?? '—'} />
        {user.creditExpiryDate && (
          <InfoRow
            label="Kredit muddat"
            value={new Date(user.creditExpiryDate).toLocaleDateString('uz')}
          />
        )}
      </View>

      {/* Havolalar */}
      <View style={styles.links}>
        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Gyms')}>
          <Text style={styles.linkText}>🏋️ Sport Zallar</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Bookings')}>
          <Text style={styles.linkText}>📅 Bronlarim</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('QrScanner')}>
          <Text style={styles.linkText}>📷 QR Scanner</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Collections')}>
          <Text style={styles.linkText}>🎥 Video Kurslar</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Chiqish */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Ilovadan chiqish</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 20, paddingTop: 50, alignItems: 'center' },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#fff', alignSelf: 'flex-start', marginBottom: 24 },
  avatarWrap: { position: 'relative', marginBottom: 16 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: '#FF6B00' },
  avatarPlaceholder: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#2a1800', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FF6B00',
  },
  avatarInitial: { fontSize: 36, fontWeight: '700', color: '#FF6B00' },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject, borderRadius: 48,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  avatarEdit: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#FF6B00', borderRadius: 10,
    width: 26, height: 26, justifyContent: 'center', alignItems: 'center',
  },
  avatarEditText: { fontSize: 12 },
  name: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4 },
  phone: { color: '#888', fontSize: 14, marginBottom: 24 },
  creditsCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#2a1800', borderRadius: 14, padding: 16,
    width: '100%', marginBottom: 16, borderWidth: 1, borderColor: '#FF6B00',
  },
  creditsLabel: { color: '#888', fontSize: 12, marginBottom: 2 },
  creditsValue: { color: '#FF6B00', fontSize: 20, fontWeight: '800' },
  topUpBtn: { backgroundColor: '#FF6B00', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  topUpText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  infoCard: {
    backgroundColor: '#1e1e1e', borderRadius: 14,
    width: '100%', marginBottom: 16, borderWidth: 1, borderColor: '#2a2a2a',
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    padding: 14, borderBottomWidth: 1, borderBottomColor: '#2a2a2a',
  },
  infoLabel: { color: '#888', fontSize: 14 },
  infoValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  links: { width: '100%', backgroundColor: '#1e1e1e', borderRadius: 14, marginBottom: 24, borderWidth: 1, borderColor: '#2a2a2a' },
  link: {
    flexDirection: 'row', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#2a2a2a',
  },
  linkText: { color: '#fff', fontSize: 15 },
  linkArrow: { color: '#555', fontSize: 18 },
  logoutBtn: {
    width: '100%', padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: '#aa2222', alignItems: 'center',
  },
  logoutText: { color: '#ff4444', fontWeight: '700', fontSize: 15 },
});
```

---

## 18. APP.tsx

```typescript
import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { useAuthStore } from './src/store/authStore';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    init();
  }, []);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <AppNavigator />
    </>
  );
}
```

---

## API Endpointlar to'liq ro'yxati

| Method | Endpoint | Auth | Tavsif |
|--------|----------|------|--------|
| POST | `/auth/sms/send` | - | SMS OTP yuborish |
| POST | `/auth/sms/verify` | - | SMS OTP tasdiqlash → token |
| POST | `/auth/telegram/verify` | - | Telegram kod → token |
| POST | `/auth/complete-profile` | ✅ | Profil to'ldirish |
| POST | `/auth/refresh` | - | Token yangilash |
| GET | `/user/me` | ✅ | Joriy user |
| PUT | `/user/profile` | ✅ | Profil yangilash |
| POST | `/user/avatar` | ✅ | Avatar yuklash (form-data) |
| GET | `/user/stats` | ✅ | Statistika |
| GET | `/gyms` | - | Zallar (category/search/lat/lng) |
| GET | `/gyms/:id` | - | Zal tafsiloti |
| GET | `/gyms/:id/slots?date=YYYY-MM-DD` | - | Vaqt slotlari |
| POST | `/gyms/:id/rate` | ✅ | Zal baholash |
| GET | `/bookings` | ✅ | Bronlar ro'yxati |
| POST | `/bookings` | ✅ | Bron qilish |
| GET | `/bookings/:id` | ✅ | Bron tafsiloti |
| DELETE | `/bookings/:id` | ✅ | Bronni bekor qilish |
| POST | `/bookings/verify-qr` | ✅ | QR orqali kirish |
| GET | `/credits` | ✅ | Kredit holati + paketlar |
| POST | `/credits/purchase` | ✅ | To'lov cheki yuborish (form-data) |
| POST | `/credits/purchase/:id/remaining` | ✅ | Qoldiq to'lov |
| GET | `/collections` | - | Kurslar ro'yxati |
| GET | `/collections/:id` | - | Kurs tafsiloti + videolar |
| POST | `/collections/:id/purchase` | ✅ | Kurs sotib olish |
| GET | `/classes/:id` | ✅ | Video dars (kirish tekshiriladi) |
| POST | `/partnership` | - | Hamkorlik so'rovi |

## Muhim qoidalar

1. **Barcha token so'rovlari:** `Authorization: Bearer <accessToken>` header
2. **Gender qiymatlari:** faqat `"Erkak"` yoki `"Ayol"` (boshqa qiymat 400 xato)
3. **Telefon formati:** `+998XXXXXXXXX` (masalan: `+998901234567`)
4. **Sana formati:** `YYYY-MM-DD` (masalan: `2026-03-26`)
5. **Bron bekor qilish:** 2 soatdan oldin bekor qilinsa kredit qaytadi
6. **Token muddati:** accessToken 30 kun, refreshToken 90 kun
7. **Rasm yuklash:** FormData bilan, `Content-Type` header QOSHMA (avtomatik)
