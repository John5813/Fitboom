import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";

import Colors from "@/constants/Colors";

const BASE_URL = "https://fitboom--moydinovjavlon4.replit.app/api/mobile/v1";

const TASHKENT = { latitude: 41.2995, longitude: 69.2401 };
const PANEL_HEIGHT = 200;

interface Gym {
  id: string;
  name: string;
  imageUrl?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  credits: number;
  hours?: string;
  avgRating?: number;
  ratingCount?: number;
  distanceKm?: number | null;
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const panelAnim = useRef(new Animated.Value(PANEL_HEIGHT)).current;

  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      let loc: { latitude: number; longitude: number } | null = null;

      if (Platform.OS !== "web") {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setUserLocation(loc);
        }
      }

      const query = loc ? `?lat=${loc.latitude}&lng=${loc.longitude}` : "";
      const res = await fetch(`${BASE_URL}/gyms${query}`);
      const json = await res.json();

      if (json.success) {
        setGyms(json.data?.gyms || json.data || []);
      }
    } catch (err) {
      console.error("MapScreen load error:", err);
    } finally {
      setLoading(false);
    }
  }

  const showPanel = useCallback(() => {
    Animated.spring(panelAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [panelAnim]);

  const hidePanel = useCallback(() => {
    Animated.timing(panelAnim, {
      toValue: PANEL_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setSelectedGym(null));
  }, [panelAnim]);

  const handleMarkerPress = useCallback(
    (gym: Gym) => {
      setSelectedGym(gym);
      showPanel();
      const lat = parseFloat(gym.latitude!);
      const lng = parseFloat(gym.longitude!);
      mapRef.current?.animateToRegion(
        { latitude: lat - 0.004, longitude: lng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        400
      );
    },
    [showPanel]
  );

  const handleMapPress = useCallback(() => {
    if (selectedGym) hidePanel();
  }, [selectedGym, hidePanel]);

  const goToUserLocation = () => {
    if (!userLocation) return;
    mapRef.current?.animateToRegion(
      { ...userLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 },
      500
    );
  };

  const mappableGyms = gyms.filter(
    (g) =>
      g.latitude &&
      g.longitude &&
      !isNaN(parseFloat(g.latitude)) &&
      !isNaN(parseFloat(g.longitude))
  );

  const initialRegion = userLocation
    ? { ...userLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : { ...TASHKENT, latitudeDelta: 0.15, longitudeDelta: 0.15 };

  const topPad = Platform.OS === "web" ? 16 : insets.top + 12;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Zallar yuklanmoqda...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        onPress={handleMapPress}
      >
        {mappableGyms.map((gym) => (
          <Marker
            key={gym.id}
            coordinate={{
              latitude: parseFloat(gym.latitude!),
              longitude: parseFloat(gym.longitude!),
            }}
            onPress={() => handleMarkerPress(gym)}
            pinColor={
              selectedGym?.id === gym.id ? Colors.primary : "#64748B"
            }
          />
        ))}
      </MapView>

      {/* Header */}
      <View style={[styles.header, { top: topPad }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerText}>Xaritada zallar</Text>
          <Text style={styles.headerSub}>{mappableGyms.length} ta zal</Text>
        </View>
      </View>

      {/* My location button */}
      {userLocation && (
        <TouchableOpacity
          style={[styles.myLocBtn, { bottom: selectedGym ? PANEL_HEIGHT + 16 : 100 + insets.bottom }]}
          onPress={goToUserLocation}
          activeOpacity={0.85}
        >
          <Feather name="navigation" size={18} color={Colors.primary} />
        </TouchableOpacity>
      )}

      {/* No-coord badge */}
      {gyms.length > mappableGyms.length && !selectedGym && (
        <View style={[styles.noCoordbadge, { bottom: 100 + insets.bottom }]}>
          <Feather name="alert-circle" size={12} color={Colors.textSecondary} />
          <Text style={styles.noCoordText}>
            {gyms.length - mappableGyms.length} ta zalning manzili yo'q
          </Text>
        </View>
      )}

      {/* Bottom panel */}
      <Animated.View
        style={[
          styles.panel,
          { paddingBottom: insets.bottom + 12 },
          { transform: [{ translateY: panelAnim }] },
        ]}
      >
        {selectedGym && (
          <View style={styles.panelInner}>
            {/* Drag handle */}
            <View style={styles.dragHandle} />

            <View style={styles.gymRow}>
              {selectedGym.imageUrl ? (
                <Image
                  source={{ uri: selectedGym.imageUrl }}
                  style={styles.gymImage}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.gymImage, styles.gymImagePlaceholder]}>
                  <Feather name="activity" size={22} color="#94A3B8" />
                </View>
              )}

              <View style={styles.gymInfo}>
                <Text style={styles.gymName} numberOfLines={1}>
                  {selectedGym.name}
                </Text>

                <View style={styles.gymMeta}>
                  <View style={styles.metaChip}>
                    <Feather name="zap" size={11} color={Colors.primary} />
                    <Text style={styles.metaText}>{selectedGym.credits} kredit</Text>
                  </View>
                  {selectedGym.hours && (
                    <View style={styles.metaChip}>
                      <Feather name="clock" size={11} color={Colors.textSecondary} />
                      <Text style={[styles.metaText, { color: Colors.textSecondary }]}>
                        {selectedGym.hours}
                      </Text>
                    </View>
                  )}
                  {selectedGym.distanceKm != null && (
                    <View style={styles.metaChip}>
                      <Feather name="map-pin" size={11} color={Colors.textSecondary} />
                      <Text style={[styles.metaText, { color: Colors.textSecondary }]}>
                        {selectedGym.distanceKm < 1
                          ? `${Math.round(selectedGym.distanceKm * 1000)} m`
                          : `${selectedGym.distanceKm.toFixed(1)} km`}
                      </Text>
                    </View>
                  )}
                </View>

                {selectedGym.avgRating != null && (
                  <View style={styles.ratingRow}>
                    <Feather name="star" size={12} color="#F59E0B" />
                    <Text style={styles.ratingText}>
                      {Number(selectedGym.avgRating).toFixed(1)}
                    </Text>
                    {selectedGym.ratingCount != null && (
                      <Text style={styles.ratingCount}>
                        ({selectedGym.ratingCount} ta)
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>

            <View style={styles.panelActions}>
              <TouchableOpacity
                style={styles.detailBtn}
                onPress={() => router.push(`/gym/${selectedGym.id}` as any)}
                activeOpacity={0.85}
              >
                <Feather name="info" size={15} color={Colors.primary} />
                <Text style={styles.detailBtnText}>Batafsil</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bookBtn}
                onPress={() => router.push(`/gym/${selectedGym.id}` as any)}
                activeOpacity={0.85}
              >
                <Feather name="calendar" size={15} color="#fff" />
                <Text style={styles.bookBtnText}>Bron qilish</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },

  /* Header */
  header: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    zIndex: 10,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
  },
  headerTitle: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 5,
  },
  headerText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },

  /* My location */
  myLocBtn: {
    position: "absolute",
    right: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
  },

  /* No coord badge */
  noCoordbadge: {
    position: "absolute",
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  noCoordText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },

  /* Bottom panel */
  panel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
    minHeight: PANEL_HEIGHT,
  },
  panelInner: {
    padding: 16,
    gap: 14,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: 4,
  },
  gymRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  gymImage: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: Colors.surface,
  },
  gymImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  gymInfo: {
    flex: 1,
    gap: 6,
  },
  gymName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  gymMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.surface,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  metaText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#F59E0B",
  },
  ratingCount: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },

  /* Panel actions */
  panelActions: {
    flexDirection: "row",
    gap: 10,
  },
  detailBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    paddingVertical: 12,
  },
  detailBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  bookBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  bookBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
