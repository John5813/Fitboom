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
import Colors from "@/constants/Colors";
import GymCard from "@/components/GymCard";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, refetchUser } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);

  const { data: gymsData, refetch: refetchGyms } = useQuery({
    queryKey: ["/api/gyms"],
    queryFn: () => getGyms(),
    refetchOnWindowFocus: true,
    refetchInterval: 60000,
  });

  const gyms = gymsData?.gyms?.slice(0, 3) || [];

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
  const isExpiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 5;

  const LANG_FLAGS: Record<string, string> = { uz: "🇺🇿", ru: "🇷🇺", en: "🇬🇧" };
  const LANG_LABELS: Record<string, string> = { uz: "UZB", ru: "RUS", en: "ENG" };
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
        {/* FitBoom Logo */}
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Feather name="zap" size={18} color="#fff" />
          </View>
          <Text style={styles.logoText}>
            <Text style={styles.logoFit}>Fit</Text>
            <Text style={styles.logoBoom}>Boom</Text>
          </Text>
        </View>

        {/* Right icons */}
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.langBtn}
            onPress={() => setLanguage(nextLang())}
            activeOpacity={0.7}
          >
            <Text style={styles.langFlag}>{LANG_FLAGS[language]}</Text>
            <Text style={styles.langLabel}>{LANG_LABELS[language]}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/(tabs)/profile" as any)}
            activeOpacity={0.7}
          >
            <View style={styles.avatarCircle}>
              <Feather name="user" size={16} color={Colors.primary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/(tabs)/profile" as any)}
            activeOpacity={0.7}
          >
            <Feather name="settings" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Green Credit Card ─── */}
      <LinearGradient
        colors={
          isExpired
            ? ["#ef4444", "#b91c1c"]
            : ["#4ade80", "#16a34a", "#166534"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.creditCard}
      >
        <View style={styles.creditLeft}>
          <Text style={styles.creditKeyEmoji}>🔑</Text>
          <View style={styles.creditInfo}>
            <Text style={styles.creditLabel}>{t("profile.credits_title")}</Text>
            <View style={styles.creditAmountRow}>
              <Text style={styles.creditAmount}>{user?.credits ?? 0}</Text>
              <Text style={styles.creditUnit}> {t("profile.credits_count")}</Text>
            </View>
            {daysLeft !== null && !isExpired && (
              <View style={styles.creditDaysRow}>
                <Feather
                  name={isExpiringSoon ? "alert-triangle" : "clock"}
                  size={12}
                  color={isExpiringSoon ? "#fde68a" : "rgba(255,255,255,0.7)"}
                />
                <Text
                  style={[
                    styles.creditDays,
                    isExpiringSoon && { color: "#fde68a" },
                  ]}
                >
                  {daysLeft} {t("profile.days_left")}
                </Text>
              </View>
            )}
            {isExpired && (
              <Text style={[styles.creditDays, { color: "#fde68a" }]}>
                {t("profile.expired_message")}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.topupBtn}
          onPress={() => router.push("/payment" as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.topupBtnText}>
            {isExpired ? t("profile.renew") : t("profile.topup")}
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* ─── Nearby Gyms Section ─── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>{t("home.near_gyms")}</Text>
            <Text style={styles.sectionSubtitle}>{t("home.sorted_by_distance")}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/(tabs)/gyms" as any)}>
            <Text style={styles.viewAll}>{t("home.view_all")}</Text>
          </TouchableOpacity>
        </View>

        {gyms.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="activity" size={40} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>{t("common.loading")}</Text>
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
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 16,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  logoText: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  logoFit: {
    color: "#fff",
  },
  logoBoom: {
    color: Colors.primary,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  langBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.card,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  langFlag: {
    fontSize: 14,
  },
  langLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Credit Card */
  creditCard: {
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  creditLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  creditKeyEmoji: {
    fontSize: 36,
  },
  creditInfo: {
    gap: 2,
  },
  creditLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
  },
  creditAmountRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  creditAmount: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    lineHeight: 38,
  },
  creditUnit: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.8)",
  },
  creditDaysRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  creditDays: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
  },
  topupBtn: {
    backgroundColor: "#fbbf24",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#fbbf24",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  topupBtnText: {
    color: "#1a1a1a",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },

  /* Section */
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  viewAll: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
    marginTop: 3,
  },

  /* Empty */
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
});
