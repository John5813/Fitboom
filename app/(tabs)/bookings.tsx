import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";

import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { getBookings, cancelBooking } from "@/services/api";
import Colors from "@/constants/Colors";
import BookingCard from "@/components/BookingCard";

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { refetchUser } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [refreshing, setRefreshing] = useState(false);
  const [qrBooking, setQrBooking] = useState<any>(null);

  const { data, refetch } = useQuery({
    queryKey: ["bookings"],
    queryFn: getBookings,
  });

  const allBookings = data?.bookings || [];
  const upcoming = allBookings.filter(
    (b: any) => b.status === "confirmed" && new Date(b.scheduledDate) >= new Date(new Date().setHours(0, 0, 0, 0))
  );
  const past = allBookings.filter(
    (b: any) => b.status !== "confirmed" || new Date(b.scheduledDate) < new Date(new Date().setHours(0, 0, 0, 0))
  );

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      refetchUser();
    },
    onError: (err: any) => {
      Alert.alert(t("common.error"), err.message);
    },
  });

  const confirmCancel = (booking: any) => {
    Alert.alert(
      t("bookings.cancel"),
      "Bronni bekor qilmoqchimisiz? Kredit qaytariladi.",
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("bookings.cancel"),
          style: "destructive",
          onPress: () => cancelMutation.mutate(booking.id),
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
          {(["upcoming", "past"] as const).map((tabKey) => (
            <TouchableOpacity
              key={tabKey}
              style={[styles.tabBtn, tab === tabKey && styles.tabBtnActive]}
              onPress={() => setTab(tabKey)}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  tab === tabKey && styles.tabBtnTextActive,
                ]}
              >
                {t(`bookings.${tabKey}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {list.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="calendar" size={40} color={Colors.textSecondary} />
            <Text style={styles.emptyTitle}>
              {t(`bookings.no_${tab}`)}
            </Text>
          </View>
        ) : (
          list.map((booking: any) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onShowQR={() => setQrBooking(booking)}
              onCancel={
                tab === "upcoming"
                  ? () => confirmCancel(booking)
                  : undefined
              }
            />
          ))
        )}
      </ScrollView>

      <Modal
        visible={!!qrBooking}
        transparent
        animationType="slide"
        onRequestClose={() => setQrBooking(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.qrModal}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setQrBooking(null)}
            >
              <Feather name="x" size={20} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.qrTitle}>{t("bookings.show_qr")}</Text>
            {qrBooking && (
              <>
                <Text style={styles.qrGymName}>
                  {qrBooking.gymName || "Zal"}
                </Text>
                <Text style={styles.qrDate}>
                  {qrBooking.scheduledDate
                    ? new Date(qrBooking.scheduledDate).toLocaleDateString("uz-UZ")
                    : ""}{" "}
                  {qrBooking.startTime || ""}
                </Text>
                <View style={styles.qrContainer}>
                  <QRCode
                    value={qrBooking.id}
                    size={200}
                    color="#1a1a2e"
                    backgroundColor="#fff"
                  />
                </View>
                <Text style={styles.qrHint}>
                  Zal QR-kodini skanerlash uchun bu kodni ko'rsating
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  tabBtnTextActive: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  list: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  qrModal: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: "center",
    gap: 12,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  modalClose: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 8,
  },
  qrTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  qrGymName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  qrDate: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  qrHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
