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
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { router } from "expo-router";

import { getGyms } from "@/services/api";

const TASHKENT = { lat: 41.2995, lng: 69.2401 };

function buildMapHtml(gyms: any[], userLat?: number, userLng?: number) {
  const markers = gyms
    .filter((g) => g.latitude && g.longitude)
    .map(
      (g) =>
        `L.marker([${parseFloat(g.latitude)}, ${parseFloat(g.longitude)}])
          .addTo(map)
          .bindPopup("<b>${g.name}</b><br>${g.credits} kredit");`
    )
    .join("\n");

  const userMarker =
    userLat && userLng
      ? `L.circleMarker([${userLat}, ${userLng}], {
            radius: 8, color: '#fff', weight: 3,
            fillColor: '#3b82f6', fillOpacity: 1
          }).addTo(map).bindPopup("Siz bu yerdasiz");`
      : "";

  const centerLat = userLat || TASHKENT.lat;
  const centerLng = userLng || TASHKENT.lng;

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #map { width: 100%; height: 100%; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map').setView([${centerLat}, ${centerLng}], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  ${markers}
  ${userMarker}
</script>
</body>
</html>`;
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
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
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserLocation(loc);
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
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }
    } finally {
      setLocating(false);
    }
  };

  const mapHtml = buildMapHtml(
    allGyms,
    userLocation?.lat,
    userLocation?.lng
  );

  const topPad = Platform.OS === "web" ? 16 : insets.top + 8;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: topPad, paddingBottom: 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={20} color="#333" />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Eng Yaqin Zallar</Text>
      <Text style={styles.subtitle}>Haritada sport zallarni ko'ring va tanlang</Text>

      {/* Locate button */}
      <TouchableOpacity
        style={styles.locateBtn}
        onPress={handleLocate}
        disabled={locating}
        activeOpacity={0.85}
      >
        <Feather name="navigation" size={16} color="#fff" />
        <Text style={styles.locateBtnText}>
          {locating ? "Aniqlanmoqda..." : "Mening Joylashuvim"}
        </Text>
      </TouchableOpacity>

      {/* Map */}
      <View style={styles.mapCard}>
        <WebView
          ref={webViewRef}
          source={{ html: mapHtml }}
          style={styles.map}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
        />
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
