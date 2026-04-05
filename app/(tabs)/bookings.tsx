import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { getBookings, cancelBooking, getAccessToken } from "@/services/api";
import Colors from "@/constants/Colors";

const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

function isWithin2Hours(booking: any): boolean {
  try {
    const dateStr = booking.scheduledDate || booking.date;
    const timeStr = booking.scheduledStartTime || booking.startTime || booking.time;
    if (!dateStr || !timeStr) return false;
    const dateOnly = dateStr.split("T")[0];
    const dt = new Date(`${dateOnly}T${timeStr}`);
    if (isNaN(dt.getTime())) return false;
    const diffMs = dt.getTime() - Date.now();
    return diffMs >= 0 && diffMs <= 2 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export default function BookingsScreen() {
  const { t } = useLanguage();
  const { refetchUser } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

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

  function getStatusInfo(status: string) {
    switch (status) {
      case "pending":
        return {
          label: t("bookings.status_pending"),
          bg: "rgba(245,158,11,0.12)",
          color: "#f59e0b",
          stripe: "#f59e0b",
        };
      case "completed":
        return {
          label: t("bookings.status_completed"),
          bg: "rgba(16,185,129,0.12)",
          color: "#10b981",
          stripe: "#10b981",
        };
      case "missed":
        return {
          label: t("bookings.status_missed"),
          bg: "rgba(249,115,22,0.1)",
          color: "#f97316",
          stripe: "#f97316",
        };
      case "cancelled":
        return {
          label: t("bookings.status_cancelled"),
          bg: "rgba(239,68,68,0.1)",
          color: "#ef4444",
          stripe: "#ef4444",
        };
      default:
        return {
          label: status || t("bookings.status_unknown"),
          bg: Colors.surface,
          color: Colors.textSecondary,
          stripe: Colors.textSecondary,
        };
    }
  }

  const startCancel = (bookingId: string, booking: any) => {
    if (!bookingId) {
      Alert.alert(t("common.error"), t("bookings.error_no_id"));
      return;
    }
    if (isWithin2Hours(booking)) {
      Alert.alert(
        t("bookings.cancel_2h_title"),
        t("bookings.cancel_2h_msg"),
        [
          { text: t("bookings.cancel_stay"), style: "cancel" },
          { text: t("bookings.cancel_do"), style: "destructive", onPress: () => doCancel(bookingId) },
        ]
      );
      return;
    }
    setConfirmingId(bookingId);
  };

  const doCancel = (bookingId: string) => {
    setCancellingId(bookingId);
    getAccessToken()
      .then((token) => {
        if (!token) throw new Error(t("bookings.session_expired"));
        return cancelBooking(bookingId, token);
      })
      .then((result) => {
        queryClient.invalidateQueries({ queryKey: ["bookings"] });
        refetchUser();
        if (result.noRefund) {
          Alert.alert(t("bookings.cancelled"), t("bookings.cancel_no_refund"));
        } else {
          Alert.alert(
            t("bookings.cancel_success"),
            t("bookings.cancel_base_msg") +
              (result.creditsRefunded
                ? " " + result.creditsRefunded + t("bookings.cancel_refund_suffix")
                : "")
          );
        }
      })
      .catch((err: any) => {
        Alert.alert(
          t("common.error"),
          err?.message || t("bookings.cancel_error")
        );
      })
      .finally(() => {
        setCancellingId(null);
        setConfirmingId(null);
      });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const list = tab === "upcoming" ? upcoming : past;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={[styles.header, { paddingTop: 12 }]}>
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
              {`${t("bookings.tab_upcoming")} (${upcoming.length})`}
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
              {`${t("bookings.tab_past")} (${past.length})`}
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
                ? t("bookings.empty_upcoming")
                : t("bookings.empty_past")}
            </Text>
          </View>
        ) : (
          list.map((booking: any) => {
            const isPending = booking.status === "pending";
            const statusInfo = getStatusInfo(booking.status || "pending");
            const gymName =
              booking.gym?.name || booking.gymName || t("bookings.gym_default");
            const rawAddress = booking.gym?.address || booking.address || "";
            const addrLower = rawAddress.trim().toLowerCase();
            const gymAddress =
              addrLower.startsWith("http://") || addrLower.startsWith("https://")
                ? ""
                : rawAddress;
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
            const isConfirming = confirmingId === bookingId;
            const within2h = isPending && isWithin2Hours(booking);

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

                  {within2h && (
                    <View style={styles.warningBanner}>
                      <Feather name="alert-triangle" size={13} color="#f59e0b" />
                      <Text style={styles.warningText}>
                        {t("bookings.within_2h_warning")}
                      </Text>
                    </View>
                  )}

                  {isPending && (
                    isConfirming ? (
                      <View style={styles.confirmRow}>
                        <Text style={styles.confirmText}>
                          {t("bookings.cancel_confirm")}
                        </Text>
                        <View style={styles.confirmBtns}>
                          <TouchableOpacity
                            style={styles.confirmNo}
                            activeOpacity={0.7}
                            onPress={() => setConfirmingId(null)}
                          >
                            <Text style={styles.confirmNoText}>
                              {t("bookings.cancel_no")}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.confirmYes,
                              isCancelling && { opacity: 0.6 },
                            ]}
                            activeOpacity={0.7}
                            disabled={isCancelling}
                            onPress={() => doCancel(bookingId)}
                          >
                            {isCancelling ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Text style={styles.confirmYesText}>
                                {t("bookings.cancel_yes")}
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.actions}>
                        <TouchableOpacity
                          style={styles.scanBtn}
                          activeOpacity={0.7}
                          onPress={() =>
                            router.push("/(tabs)/scanner" as any)
                          }
                        >
                          <Feather name="camera" size={14} color="#fff" />
                          <Text style={styles.scanBtnText}>
                            {t("bookings.scanner_btn")}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.cancelBtn}
                          activeOpacity={0.7}
                          onPress={() => startCancel(bookingId, booking)}
                        >
                          <Text style={styles.cancelBtnText}>
                            {t("bookings.cancel")}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
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
  confirmRow: { gap: 8 },
  confirmText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  confirmBtns: { flexDirection: "row", gap: 8 },
  confirmNo: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: "center",
  },
  confirmNoText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  confirmYes: {
    flex: 2,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmYesText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245,158,11,0.12)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
  },
  warningText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#f59e0b",
    flex: 1,
    lineHeight: 15,
  },
});
