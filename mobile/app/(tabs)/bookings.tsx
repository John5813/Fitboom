import React, { useCallback, useState } from "react";
import { Alert, Linking, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, X } from "lucide-react-native";
import { formatDateShort } from "@shared/format";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getBookings, cancelBooking, getAccessToken } from "@/services/api";
import { BookingCardSkeleton } from "@/components/Skeleton";
import { AnimatedListItem } from "@/components/AnimatedListItem";
import BookingCard from "@/components/BookingCard";
import { Button, Font, Radius } from "@/components/ui";

/*
 * Bronlar — vebdagi HomePage (bookings tab) bilan bir xil: sarlavha va
 * "Bronlar tarixi" tugmasi, faol bronlar BookingCard bilan, bajarilgan va
 * kelinmaganlari tarix oynasida.
 */

/** Boshlanishiga qancha soat qoldi — Toshkent vaqti (UTC+5), vebdagi bilan bir xil */
function hoursUntilStart(booking: any): number | null {
  const time = booking.scheduledStartTime || booking.time;
  const date = (booking.scheduledDate || booking.date || "").split("T")[0];
  if (!time || !date) return null;
  const [h, m] = String(time).split(":").map(Number);
  const [y, mo, d] = date.split("-").map(Number);
  if ([h, m, y, mo, d].some((n) => Number.isNaN(n))) return null;
  return (Date.UTC(y, mo - 1, d, h - 5, m) - Date.now()) / 3_600_000;
}

const isActive = (b: any) =>
  !b.isCompleted && b.status !== "missed" && b.status !== "completed" && b.status !== "cancelled";

export default function BookingsScreen() {
  const { t } = useLanguage();
  const { refetchUser } = useAuth();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: getBookings,
    staleTime: 0,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const all: any[] = data?.bookings || [];
  // Eng yaqin bron tepada (vebda ham shunday)
  const active = all
    .filter(isActive)
    .sort((a, b) =>
      `${a.scheduledDate || a.date} ${a.scheduledStartTime || a.time}`.localeCompare(
        `${b.scheduledDate || b.date} ${b.scheduledStartTime || b.time}`,
      ),
    );
  const history = all.filter((b) => !isActive(b) && b.status !== "cancelled");

  const slotText = (b: any) =>
    b.scheduledStartTime && b.scheduledEndTime ? `${b.scheduledStartTime} - ${b.scheduledEndTime}` : b.time || "";

  const startCancel = (booking: any) => {
    const hours = hoursUntilStart(booking);
    if (hours !== null && hours < 2) {
      Alert.alert(
        "Diqqat!",
        "Boshlanishga 2 soatdan kam vaqt qoldi.\n\nBronni bekor qilsangiz kredit qaytarilmaydi.\n\nDavom etasizmi?",
        [
          { text: t("bookings.cancel_stay"), style: "cancel" },
          { text: t("bookings.cancel_do"), style: "destructive", onPress: () => doCancel(booking.id) },
        ],
      );
      return;
    }
    Alert.alert(t("bookings.cancel_confirm"), undefined, [
      { text: t("bookings.cancel_no"), style: "cancel" },
      { text: t("bookings.cancel_yes"), style: "destructive", onPress: () => doCancel(booking.id) },
    ]);
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
      });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const openMap = (b: any) => {
    const gym = b.gym || {};
    const q = gym.latitude && gym.longitude ? `${gym.latitude},${gym.longitude}` : gym.address || gym.name;
    if (q) Linking.openURL(`https://www.google.com/maps?q=${encodeURIComponent(q)}`);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>{t("profile.history_title")}</Text>
          <Button variant="outline" size="sm" icon={Clock} iconSize={16} onPress={() => setShowHistory(true)}>
            {t("profile.history_title")}
          </Button>
        </View>

        {isLoading && !data ? (
          <BookingCardSkeleton count={3} />
        ) : active.length > 0 ? (
          <View style={styles.list}>
            {active.map((b, idx) => (
              <AnimatedListItem key={b.id} index={Math.min(idx, 6)}>
                <BookingCard
                  gymName={b.gym?.name || t("profile.unknown_gym")}
                  gymImage={b.gym?.imageUrl}
                  date={formatDateShort(b.scheduledDate || b.date)}
                  time={slotText(b)}
                  onScanQR={() => router.push("/(tabs)/scanner" as any)}
                  onOpenMap={b.gym?.address || b.gym?.latitude ? () => openMap(b) : undefined}
                  onCancel={() => startCancel(b)}
                  cancelling={cancellingId === b.id}
                />
              </AnimatedListItem>
            ))}
          </View>
        ) : (
          <Text style={[styles.empty, { color: theme.textSecondary }]}>{t("profile.no_history")}</Text>
        )}
      </ScrollView>

      {/* Tarix oynasi — vebdagi Dialog */}
      <Modal visible={showHistory} transparent animationType="fade" onRequestClose={() => setShowHistory(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowHistory(false)}>
          <Pressable style={[styles.dialog, { backgroundColor: theme.card }]} onPress={() => {}}>
            <View style={[styles.dialogHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.dialogTitle, { color: theme.text }]}>{t("profile.history_title")}</Text>
              <Pressable onPress={() => setShowHistory(false)} hitSlop={12} accessibilityLabel="Yopish">
                <X size={18} color={theme.textSecondary} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.dialogBody}>
              {history.length > 0 ? (
                history.map((b) => {
                  const label =
                    b.status === "completed" || b.isCompleted
                      ? "Tashrif buyurilgan"
                      : b.status === "missed"
                        ? "Kelmagan"
                        : "Yakunlangan";
                  const done = b.status === "completed" || b.isCompleted;
                  return (
                    <View key={b.id} style={[styles.historyItem, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.historyName, { color: theme.text }]} numberOfLines={1}>
                          {b.gym?.name || t("profile.unknown_gym")}
                        </Text>
                        <Text style={[styles.historyMeta, { color: theme.textSecondary }]}>
                          {formatDateShort(b.scheduledDate || b.date)} • {b.time}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.historyBadge,
                          done
                            ? { backgroundColor: "#F8F5ED" }
                            : { borderWidth: 1, borderColor: theme.border },
                        ]}
                      >
                        <Text style={[styles.historyBadgeText, { color: done ? "#432F19" : theme.text }]}>{label}</Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={[styles.empty, { color: theme.textSecondary, paddingVertical: 32 }]}>
                  {t("profile.no_history")}
                </Text>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  // p-4 space-y-6
  content: { padding: 16, gap: 24, paddingBottom: 110 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { fontSize: 24, lineHeight: 32, fontFamily: Font.display, flexShrink: 1 },
  list: { gap: 12 },
  empty: { textAlign: "center", paddingVertical: 32, fontSize: 14, fontFamily: Font.regular },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", alignItems: "center", justifyContent: "center", padding: 16 },
  dialog: { width: "90%", maxWidth: 360, maxHeight: "80%", borderRadius: Radius["2xl"], overflow: "hidden" },
  dialogHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  dialogTitle: { fontSize: 18, fontFamily: Font.semibold },
  dialogBody: { padding: 16, gap: 12 },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  historyName: { fontSize: 14, fontFamily: Font.semibold },
  historyMeta: { fontSize: 12, fontFamily: Font.regular, marginTop: 2 },
  historyBadge: { borderRadius: Radius.md, paddingHorizontal: 6, height: 20, justifyContent: "center" },
  historyBadgeText: { fontSize: 10, fontFamily: Font.semibold },
});
