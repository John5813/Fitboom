import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getGyms } from "@/services/api";
import GymCard from "@/components/GymCard";
import PaymentMethodModal from "@/components/PaymentMethodModal";
import Colors from "@/constants/Colors";

const LANG_LABELS: Record<string, string> = { uz: "UZB", ru: "RUS", en: "ENG" };

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, refetchUser } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    (async () => {
      if (Platform.OS === "web") return;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    })();
  }, []);

  const { data: gymsData, refetch: refetchGyms } = useQuery({
    queryKey: ["/api/gyms", userCoords?.lat, userCoords?.lng],
    queryFn: () => getGyms({ lat: userCoords?.lat, lng: userCoords?.lng }),
    refetchOnWindowFocus: true,
    refetchInterval: 60000,
  });

  const gyms = useMemo(() => {
    const raw = gymsData?.gyms || [];
    return raw
      .filter((g: any) => g.name !== "Velodrom")
      .map((g: any) => {
        const lat2 = parseFloat(g.latitude);
        const lng2 = parseFloat(g.longitude);
        const distanceKm =
          userCoords && !isNaN(lat2) && !isNaN(lng2)
            ? haversineKm(userCoords.lat, userCoords.lng, lat2, lng2)
            : null;
        return { ...g, distanceKm };
      })
      .sort((a: any, b: any) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0;
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      })
      .slice(0, 3);
  }, [gymsData, userCoords]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchUser(), refetchGyms()]);
    setRefreshing(false);
  };

  const topPadding = Platform.OS === "web" ? 16 : insets.top + 8;

  const daysLeft = user?.creditExpiryDate
    ? Math.ceil(
        (new Date(user.creditExpiryDate).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const isExpired = daysLeft !== null && daysLeft <= 0;

  const nextLang = (): "uz" | "ru" | "en" => {
    if (language === "uz") return "ru";
    if (language === "ru") return "en";
    return "uz";
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding, paddingBottom: 110 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logoText}>
            <Text style={styles.logoFit}>Fit</Text>
            <Text style={styles.logoBoom}>Boom</Text>
          </Text>
          <Text style={styles.logoSubtitle}>Sport hayotingizni boshqaring</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.langBtn}
            onPress={() => setLanguage(nextLang())}
            activeOpacity={0.7}
          >
            <Feather name="globe" size={13} color={Colors.textSecondary} />
            <Text style={styles.langLabel}>{LANG_LABELS[language]}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/(tabs)/profile" as any)}
            activeOpacity={0.7}
          >
            <View style={styles.avatarCircle}>
              <Feather name="user" size={16} color={Colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Kredit Kartasi ─── */}
      <LinearGradient
        colors={
          isExpired
            ? ["#ef4444", "#b91c1c"]
            : ["#22c55e", "#16a34a", "#15803d"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.creditCard}
      >
        <View style={styles.creditLeft}>
          <View style={styles.creditIconBox}>
            <Feather name="zap" size={24} color="#fff" />
          </View>
          <View>
            <Text style={styles.creditLabel}>Kredit balansi</Text>
            <Text style={styles.creditNumber}>{user?.credits ?? 0}</Text>
            {daysLeft !== null && !isExpired && (
              <View style={styles.daysRow}>
                <Feather name="clock" size={11} color="rgba(255,255,255,0.8)" />
                <Text style={styles.daysText}>{daysLeft} kun qoldi</Text>
              </View>
            )}
            {isExpired && (
              <Text style={styles.daysText}>Muddati o'tgan</Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.topupBtn}
          onPress={() => setPaymentModalVisible(true)}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={14} color={Colors.primary} />
          <Text style={styles.topupBtnText}>
            {isExpired ? "Yangilash" : "To'ldirish"}
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* ─── Yaqin Zallar ─── */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Sizga eng yaqin zallar</Text>
          <Text style={styles.sectionSubtitle}>Masofaga qarab saralangan</Text>
        </View>
        <TouchableOpacity
          style={styles.viewAllBtn}
          onPress={() => router.push("/(tabs)/map" as any)}
        >
          <Text style={styles.viewAll}>Barchasini ko'rish</Text>
          <Feather name="arrow-right" size={14} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {gyms.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="activity" size={36} color="#CBD5E1" />
          <Text style={styles.emptyText}>Yuklanmoqda...</Text>
        </View>
      ) : (
        gyms.map((gym: any) => (
          <GymCard
            key={gym.id}
            gym={gym}
            onPress={() => router.push(`/gym/${gym.id}?distanceKm=${gym.distanceKm ?? ""}` as any)}
            onBook={() => router.push(`/gym/${gym.id}?distanceKm=${gym.distanceKm ?? ""}` as any)}
          />
        ))
      )}

      <PaymentMethodModal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { paddingHorizontal: 16 },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  logoText: { fontSize: 28, fontFamily: "Inter_700Bold" },
  logoFit: { color: Colors.text },
  logoBoom: { color: Colors.primary },
  logoSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    marginTop: 3,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  langBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  iconBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Credit Card */
  creditCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  creditLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  creditIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  creditLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  creditNumber: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    lineHeight: 36,
  },
  daysRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  daysText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontFamily: "Inter_400Regular",
  },
  topupBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  topupBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },

  /* Section */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewAll: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },

  /* Empty */
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
});
