import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { getBookings, cancelBooking } from "@/services/api";
import Colors from "@/constants/Colors";

const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

function getStatusInfo(status: string) {
  switch (status) {
    case "pending":
      return {
        label: "Kutilmoqda",
        bg: "rgba(245,158,11,0.12)",
        color: "#f59e0b",
        stripe: "#f59e0b",
      };
    case "completed":
      return {
        label: "Tashrif buyurildi",
        bg: "rgba(16,185,129,0.12)",
        color: "#10b981",
        stripe: "#10b981",
      };
    case "missed":
      return {
        label: "Kelmadi",
        bg: "rgba(249,115,22,0.1)",
        color: "#f97316",
        stripe: "#f97316",
      };
    case "cancelled":
      return {
        label: "Bekor qilindi",
        bg: "rgba(239,68,68,0.1)",
        color: "#ef4444",
        stripe: "#ef4444",
      };
    default:
      return {
        label: status || "Noma'lum",
        bg: Colors.surface,
        color: Colors.textSecondary,
        stripe: Colors.textSecondary,
      };
  }
}

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { refetchUser } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: getBookings,
    staleTime: 0,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const allBookings: any[] = data?.bookings || [];

  const upcoming = allBookings.filter((b: any) => {
    const d = new Date(b.scheduledDate || b.date || 0);
    return b.status === "pending" && d >= todayStart();
  });

  const past = allBookings.filter((b: any) => {
    const d = new Date(b.scheduledDate || b.date || 0);
    return b.status !== "pending" || d < todayStart();
  });

  const doCancel = (bookingId: string) => {
    setCancellingId(bookingId);
    cancelBooking(bookingId)
      .then((result: any) => {
        const msg = result?.message
          ? result.message
          : result?.noRefund === true
            ? "Bron bekor qilindi. Kredit qaytarilmadi (2 soatdan kam qolgan)."
            : "Bron bekor qilindi. Kreditingiz qaytarildi.";
        queryClient.invalidateQueries({ queryKey: ["bookings"] });
        refetchUser();
        Alert.alert("Bekor qilindi", msg);
      })
      .catch((err: any) => {
        Alert.alert("Xatolik", err?.message || "Bronni bekor qilib bo'lmadi");
      })
      .finally(() => {
        setCancellingId(null);
      });
  };

  const handleCancel = (booking: any) => {
    const bookingId = booking.id || booking._id;

    if (!bookingId) {
      Alert.alert("Xatolik", "Bron ID topilmadi");
      return;
    }

    const gymName = booking.gym?.name || booking.gymName || "Zal";
    const timeStr = booking.scheduledStartTime || booking.time || "";

    Alert.alert(
      "Bronni bekor qilish",
      `${gymName}${timeStr ? " — " + timeStr : ""}\n\nBekor qilmoqchimisiz?`,
      [
        { text: "Yo'q", style: "cancel" },
        {
          text: "Ha, bekor qilish",
          style: "destructive",
          onPress: () => doCancel(bookingId),
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const list = tab === "upcoming" ? upcoming : past;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Text style={styles.title}>{t("bookings.title")}</Text>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "upcoming" && styles.tabBtnActive]}
            onPress={() => setTab("upcoming")}
          >
            <Text
              style={[
                styles.tabBtnText,
                tab === "upcoming" && styles.tabBtnTextActive,
              ]}
            >
              {`Kelayotgan (${upcoming.length})`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "past" && styles.tabBtnActive]}
            onPress={() => setTab("past")}
          >
            <Text
              style={[
                styles.tabBtnText,
                tab === "past" && styles.tabBtnTextActive,
              ]}
            >
              {`O'tgan (${past.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: 110 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading && !refreshing ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : list.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="calendar" size={48} color={Colors.textSecondary} />
            <Text style={styles.emptyTitle}>
              {tab === "upcoming"
                ? "Hozircha faol bronlar yo'q"
                : "O'tgan bronlar yo'q"}
            </Text>
          </View>
        ) : (
          list.map((booking: any) => {
            const isPending = booking.status === "pending";
            const statusInfo = getStatusInfo(booking.status || "pending");
            const gymName =
              booking.gym?.name || booking.gymName || "Sport zal";
            const gymAddress = booking.gym?.address || booking.address || "";
            const startTime =
              booking.scheduledStartTime ||
              booking.time ||
              booking.startTime ||
              "";
            const endTime = booking.scheduledEndTime || booking.endTime || "";
            const dateStr =
              booking.scheduledDate || booking.date
                ? new Date(
                    booking.scheduledDate || booking.date
                  ).toLocaleDateString("uz-UZ", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })
                : "";
            const bookingId = booking.id || booking._id;
            const isCancelling = cancellingId === bookingId;

            return (
              <View key={bookingId || Math.random()} style={styles.card}>
                <View
                  style={[
                    styles.leftStripe,
                    { backgroundColor: statusInfo.stripe },
                  ]}
                />
                <View style={styles.cardContent}>
                  <View style={styles.topRow}>
                    <View style={styles.gymInfo}>
                      <Text style={styles.gymName} numberOfLines={1}>
                        {gymName}
                      </Text>
                      {gymAddress ? (
                        <View style={styles.addressRow}>
                          <Feather
                            name="map-pin"
                            size={11}
                            color={Colors.textSecondary}
                          />
                          <Text style={styles.addressText} numberOfLines={1}>
                            {gymAddress}
                          </Text>
                        </View>
                      ) : null}
                      <View style={styles.dateRow}>
                        <Feather
                          name="calendar"
                          size={12}
                          color={Colors.textSecondary}
                        />
                        <Text style={styles.dateText}>{dateStr}</Text>
                        {startTime ? (
                          <>
                            <Feather
                              name="clock"
                              size={12}
                              color={Colors.textSecondary}
                            />
                            <Text style={styles.dateText}>
                              {startTime}
                              {endTime ? ` - ${endTime}` : ""}
                            </Text>
                          </>
                        ) : null}
                      </View>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusInfo.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: statusInfo.color },
                        ]}
                      >
                        {statusInfo.label}
                      </Text>
                    </View>
                  </View>

                  {isPending && (
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={styles.scanBtn}
                        activeOpacity={0.7}
                        onPress={() =>
                          router.push("/(tabs)/scanner" as any)
                        }
                      >
                        <Feather name="camera" size={14} color="#fff" />
                        <Text style={styles.scanBtnText}>Skaner</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.cancelBtn,
                          isCancelling && { opacity: 0.5 },
                        ]}
                        activeOpacity={0.7}
                        disabled={isCancelling}
                        onPress={() => handleCancel(booking)}
                      >
                        {isCancelling ? (
                          <ActivityIndicator size="small" color="#ef4444" />
                        ) : (
                          <Text style={styles.cancelBtnText}>
                            Bekor qilish
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.card,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 12,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 10,
  },
  tabBtnActive: { backgroundColor: Colors.card },
  tabBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  tabBtnTextActive: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  list: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  emptyState: { alignItems: "center", paddingVertical: 80, gap: 12 },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  leftStripe: { width: 4 },
  cardContent: { flex: 1, padding: 16, gap: 10 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  gymInfo: { flex: 1, gap: 3, marginRight: 8 },
  gymName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  addressText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
    marginTop: 2,
  },
  dateText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  actions: { flexDirection: "row", gap: 10 },
  scanBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  scanBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(239,68,68,0.3)",
    backgroundColor: "rgba(239,68,68,0.08)",
    justifyContent: "center",
    alignItems: "center",
    minWidth: 110,
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#ef4444",
  },
});
