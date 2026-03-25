import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/api";
import Colors from "@/constants/Colors";
import GymCard from "@/components/GymCard";
import BookingCard from "@/components/BookingCard";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, refetchUser } = useAuth();
  const { t } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);

  const { data: gymsData, refetch: refetchGyms } = useQuery({
    queryKey: ["/api/gyms"],
    queryFn: () => apiRequest("/api/gyms"),
  });

  const { data: bookingsData, refetch: refetchBookings } = useQuery({
    queryKey: ["/api/bookings"],
    queryFn: () => apiRequest("/api/bookings"),
  });

  const gyms = gymsData?.gyms?.slice(0, 3) || [];
  const upcomingBookings =
    (bookingsData?.bookings || []).filter((b: any) => b.status === "confirmed").slice(0, 2);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchUser(), refetchGyms(), refetchBookings()]);
    setRefreshing(false);
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const daysLeft = user?.creditExpiryDate
    ? Math.ceil(
        (new Date(user.creditExpiryDate).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding + 16, paddingBottom: 100 },
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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>{t("home.welcome")},</Text>
          <Text style={styles.userName}>{user?.name || "Fitboom"} 👋</Text>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => router.push("/courses/index" as any)}
        >
          <Feather name="video" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Credit Card */}
      <LinearGradient
        colors={["#0B7A8C", "#085F6E"]}
        style={styles.creditCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.creditCardLeft}>
          <Text style={styles.creditLabel}>{t("home.balance")}</Text>
          <View style={styles.creditRow}>
            <Text style={styles.creditAmount}>{user?.credits ?? 0}</Text>
            <Text style={styles.creditUnit}>{t("profile.credits")}</Text>
          </View>
          {daysLeft !== null && daysLeft > 0 && (
            <Text style={styles.creditExpiry}>
              {daysLeft} {t("profile.days_left")}
            </Text>
          )}
          {daysLeft !== null && daysLeft <= 0 && (
            <Text style={[styles.creditExpiry, { color: "#FF6B6B" }]}>
              Muddat tugadi!
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.topupBtn}
          onPress={() => router.push("/payment" as any)}
        >
          <Feather name="plus" size={16} color={Colors.primary} />
          <Text style={styles.topupBtnText}>{t("home.topup")}</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {[
          {
            icon: "activity" as const,
            label: t("nav.gyms"),
            onPress: () => router.push("/(tabs)/gyms" as any),
          },
          {
            icon: "map" as const,
            label: t("nav.map"),
            onPress: () => router.push("/(tabs)/map" as any),
          },
          {
            icon: "calendar" as const,
            label: t("nav.bookings"),
            onPress: () => router.push("/(tabs)/bookings" as any),
          },
          {
            icon: "video" as const,
            label: "Video",
            onPress: () => router.push("/courses/index" as any),
          },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.quickAction}
            onPress={item.onPress}
          >
            <View style={styles.quickActionIcon}>
              <Feather name={item.icon} size={20} color={Colors.primary} />
            </View>
            <Text style={styles.quickActionLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Upcoming Bookings */}
      {upcomingBookings.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("home.upcoming")}</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/bookings" as any)}>
              <Text style={styles.viewAll}>{t("home.view_all")}</Text>
            </TouchableOpacity>
          </View>
          {upcomingBookings.map((booking: any) => (
            <BookingCard key={booking.id} booking={booking} compact />
          ))}
        </View>
      )}

      {/* Nearby Gyms */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t("home.near_gyms")}</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/gyms" as any)}>
            <Text style={styles.viewAll}>{t("home.view_all")}</Text>
          </TouchableOpacity>
        </View>
        {gyms.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="activity" size={32} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>{t("common.loading")}</Text>
          </View>
        ) : (
          gyms.map((gym: any) => (
            <GymCard
              key={gym.id}
              gym={gym}
              onPress={() => router.push(`/gym/${gym.id}` as any)}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  userName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginTop: 2,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  creditCard: {
    borderRadius: 20,
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#0B7A8C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  creditCardLeft: { gap: 4 },
  creditLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
  },
  creditRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  creditAmount: {
    fontSize: 40,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    lineHeight: 46,
  },
  creditUnit: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.8)",
  },
  creditExpiry: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_400Regular",
  },
  topupBtn: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  topupBtnText: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  quickAction: { alignItems: "center", gap: 8 },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  quickActionLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  viewAll: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
});
