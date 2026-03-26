import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import { router } from "expo-router";

import { getGyms } from "@/services/api";

const TASHKENT = { latitude: 41.2995, longitude: 69.2401 };

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);

  const { data } = useQuery({
    queryKey: ["/api/gyms"],
    queryFn: getGyms,
  });

  const allGyms = data?.gyms || [];
  const gymsWithCoords = allGyms.filter((g: any) => g.latitude && g.longitude);

  const handleLocate = async () => {
    setLocating(true);
    try {
      if (Platform.OS === "web") {
        navigator.geolocation?.getCurrentPosition(
          (pos) => {
            const loc = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            };
            setUserLocation(loc);
            mapRef.current?.animateToRegion({
              ...loc,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            });
          },
          () => Alert.alert("Xatolik", "Joylashuv aniqlanmadi")
        );
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Ruxsat kerak", "Joylashuvga ruxsat bering");
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        const loc = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setUserLocation(loc);
        mapRef.current?.animateToRegion({
          ...loc,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }
    } finally {
      setLocating(false);
    }
  };

  const topPad = Platform.OS === "web" ? 16 : insets.top + 8;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad, paddingBottom: 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={20} color="#333" />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Eng Yaqin Zallar</Text>
      <Text style={styles.subtitle}>
        Haritada sport zallarni ko'ring va tanlang
      </Text>

      {/* Locate button */}
      <TouchableOpacity
        style={[styles.locateBtn, locating && { opacity: 0.7 }]}
        onPress={handleLocate}
        disabled={locating}
        activeOpacity={0.85}
      >
        <Feather name="navigation" size={16} color="#fff" />
        <Text style={styles.locateBtnText}>
          {locating ? "Aniqlanmoqda..." : "Mening Joylashuvim"}
        </Text>
      </TouchableOpacity>

      {/* Map card */}
      <View style={styles.mapCard}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={{
            ...TASHKENT,
            latitudeDelta: 0.12,
            longitudeDelta: 0.12,
          }}
          showsUserLocation
          showsMyLocationButton={false}
          scrollEnabled
          zoomEnabled
        >
          {gymsWithCoords.map((gym: any) => (
            <Marker
              key={gym.id}
              coordinate={{
                latitude: parseFloat(gym.latitude),
                longitude: parseFloat(gym.longitude),
              }}
              title={gym.name}
              description={`${gym.credits} kredit`}
              onPress={() => router.push(`/gym/${gym.id}` as any)}
            />
          ))}
        </MapView>
      </View>

      {/* Status */}
      {gymsWithCoords.length === 0 && (
        <Text style={styles.noGymsText}>
          Haritada ko'rsatish uchun koordinatali zallar yo'q
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { paddingHorizontal: 16, gap: 14 },

  header: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#111",
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#888",
    marginTop: -4,
  },

  locateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0891b2",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignSelf: "flex-start",
  },
  locateBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },

  mapCard: {
    borderRadius: 16,
    overflow: "hidden",
    height: 340,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  map: { flex: 1 },

  noGymsText: {
    fontSize: 14,
    color: "#0891b2",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
});
