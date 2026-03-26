import React, { useState } from "react";
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

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getGyms } from "@/services/api";
import GymCard from "@/components/GymCard";
import PaymentMethodModal from "@/components/PaymentMethodModal";

const LANG_LABELS: Record<string, string> = { uz: "UZB", ru: "RUS", en: "ENG" };

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, refetchUser } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

  const { data: gymsData, refetch: refetchGyms } = useQuery({
    queryKey: ["/api/gyms"],
    queryFn: () => getGyms(),
    refetchOnWindowFocus: true,
    refetchInterval: 60000,
  });

  const gyms = (gymsData?.gyms || [])
    .filter((g: any) => g.name !== "Velodrom")
    .slice(0, 3);

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
          tintColor="#16a34a"
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
            <Feather name="globe" size={14} color="#555" />
            <Text style={styles.langLabel}>{LANG_LABELS[language]}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/(tabs)/profile" as any)}
            activeOpacity={0.7}
          >
            <View style={styles.avatarCircle}>
              <Feather name="user" size={16} color="#555" />
            </View>
          </TouchableOpacity>

        </View>
      </View>

      {/* ─── Kredit Kartasi ─── */}
      <LinearGradient
        colors={isExpired ? ["#ef4444", "#b91c1c"] : ["#22c55e", "#16a34a", "#15803d"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.creditCard}
      >
        <View style={styles.creditLeft}>
          <Text style={styles.keyEmoji}>🔑</Text>
          <View>
            <Text style={styles.creditLabel}>Kredit balansi</Text>
            <Text style={styles.creditValue}>
              Kredit balansi:{" "}
              <Text style={styles.creditNumber}>{user?.credits ?? 0}</Text>
            </Text>
            {daysLeft !== null && !isExpired && (
              <View style={styles.daysRow}>
                <Feather name="clock" size={12} color="rgba(255,255,255,0.85)" />
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
          <Text style={styles.topupBtnText}>
            {isExpired ? "Yangilash" : "To'ldirish"}
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* ─── Yaqin Zallar ─── */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Sizga eng yaqin{"\n"}zallar</Text>
          <Text style={styles.sectionSubtitle}>Masofaga qarab saralangan</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/(tabs)/map" as any)}>
          <Text style={styles.viewAll}>Barchasini ko'rish{"\n"}{">"}</Text>
        </TouchableOpacity>
      </View>

      {gyms.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="activity" size={36} color="#ccc" />
          <Text style={styles.emptyText}>Yuklanmoqda...</Text>
        </View>
      ) : (
        gyms.map((gym: any) => (
          <GymCard
            key={gym.id}
            gym={gym}
            onPress={() => router.push(`/gym/${gym.id}` as any)}
            onBook={() => router.push(`/gym/${gym.id}` as any)}
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
    marginBottom: 18,
  },
  logoText: { fontSize: 26, fontFamily: "Inter_700Bold" },
  logoFit: { color: "#111" },
  logoBoom: { color: "#F97316" },
  logoSubtitle: {
    fontSize: 13,
    color: "#888",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  langBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  langLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#444",
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
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Credit Card */
  creditCard: {
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  creditLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  keyEmoji: { fontSize: 38 },
  creditLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  creditValue: {
    fontSize: 14,
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },
  creditNumber: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
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
    backgroundColor: "#fbbf24",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  topupBtnText: {
    color: "#1a1a1a",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },

  /* Section */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#111",
    lineHeight: 26,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#888",
    fontFamily: "Inter_400Regular",
    marginTop: 3,
  },
  viewAll: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#2563EB",
    textAlign: "right",
    lineHeight: 18,
  },

  /* Empty */
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 13,
    color: "#aaa",
    fontFamily: "Inter_400Regular",
  },
});
