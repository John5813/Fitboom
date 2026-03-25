import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import { router } from "expo-router";

import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/api";
import Colors from "@/constants/Colors";

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedGym, setSelectedGym] = useState<any>(null);

  const { data } = useQuery({
    queryKey: ["/api/gyms"],
    queryFn: () => apiRequest("/api/gyms"),
  });

  const gyms = (data?.gyms || []).filter(
    (g: any) => g.latitude && g.longitude
  );

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    if (Platform.OS === "web") {
      navigator.geolocation?.getCurrentPosition((pos) => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      });
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const loc = await Location.getCurrentPositionAsync({});
    setUserLocation({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    });
  };

  const locateMe = () => {
    if (!userLocation) {
      getLocation();
      return;
    }
    mapRef.current?.animateToRegion({
      ...userLocation,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
  };

  const initialRegion = {
    latitude: userLocation?.latitude || 41.2995,
    longitude: userLocation?.longitude || 69.2401,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {gyms.map((gym: any) => (
          <Marker
            key={gym.id}
            coordinate={{
              latitude: parseFloat(gym.latitude),
              longitude: parseFloat(gym.longitude),
            }}
            title={gym.name}
            description={`${gym.credits} kredit`}
            onPress={() => setSelectedGym(gym)}
          >
            <View style={styles.marker}>
              <Feather name="activity" size={14} color="#fff" />
            </View>
          </Marker>
        ))}
      </MapView>

      <View
        style={[
          styles.headerOverlay,
          { top: Platform.OS === "web" ? 67 : insets.top + 12 },
        ]}
      >
        <View style={styles.headerCard}>
          <Feather name="map-pin" size={18} color={Colors.primary} />
          <Text style={styles.headerTitle}>{t("map.title")}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.locateBtn,
          { bottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100 },
        ]}
        onPress={locateMe}
      >
        <Feather name="crosshair" size={20} color={Colors.primary} />
      </TouchableOpacity>

      {selectedGym && (
        <View
          style={[
            styles.gymSheet,
            {
              bottom: (Platform.OS === "web" ? 34 : insets.bottom) + 80,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.gymSheetClose}
            onPress={() => setSelectedGym(null)}
          >
            <Feather name="x" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.gymSheetName}>{selectedGym.name}</Text>
          <Text style={styles.gymSheetAddress}>{selectedGym.address}</Text>
          <View style={styles.gymSheetRow}>
            <View style={styles.gymSheetBadge}>
              <Feather name="key" size={12} color={Colors.primary} />
              <Text style={styles.gymSheetBadgeText}>
                {selectedGym.credits} {t("gyms.credits")}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.gymSheetBookBtn}
              onPress={() => {
                setSelectedGym(null);
                router.push(`/gym/${selectedGym.id}` as any);
              }}
            >
              <Text style={styles.gymSheetBookBtnText}>{t("gym.book")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: Colors.card,
  },
  headerOverlay: {
    position: "absolute",
    left: 16,
    right: 16,
  },
  headerCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  locateBtn: {
    position: "absolute",
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  gymSheet: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  gymSheetClose: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 4,
  },
  gymSheetName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    paddingRight: 24,
  },
  gymSheetAddress: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  gymSheetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  gymSheetBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  gymSheetBadgeText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  gymSheetBookBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  gymSheetBookBtnText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
