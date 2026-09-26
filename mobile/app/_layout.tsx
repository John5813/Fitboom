import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
// Vebdagi --font-display: sarlavhalar, logo, kredit belgilari
import { Oxanium_700Bold, Oxanium_800ExtraBold } from "@expo-google-fonts/oxanium";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { AccessPassProvider } from "@/contexts/AccessPassContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 7,
      staleTime: 1000 * 30,
      retry: 2,
      refetchOnReconnect: true,
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "fitboom_query_cache",
  throttleTime: 1000,
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="complete-profile" options={{ headerShown: false }} />
      <Stack.Screen name="gym/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="courses/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="payment" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Oxanium_700Bold,
    Oxanium_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <ErrorBoundary>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: asyncStoragePersister,
            maxAge: 1000 * 60 * 60 * 24 * 7,
            buster: "v1",
          }}
        >
          <ThemeProvider>
            <LanguageProvider>
              <AuthProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <KeyboardProvider>
                    {/* Kirish ruxsatnomasi va uning bulutchasi hamma ekranlar ustida */}
                    <AccessPassProvider>
                      <RootLayoutNav />
                    </AccessPassProvider>
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
        </PersistQueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
