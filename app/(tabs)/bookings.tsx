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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { getBookings, cancelBooking } from "@/services/api";
import Colors from "@/constants/Colors";
import BookingCard from "@/components/BookingCard";

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { refetchUser } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useQuery({
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

  const upcoming = allBookings.filter((b) => {
    const bookingDate = new Date(b.scheduledDate || b.date || 0);
    const isActiveStatus = b.status === "pending" || b.status === "confirmed";
    return isActiveStatus && bookingDate >= today();
  });

  const past = allBookings.filter((b) => {
    const bookingDate = new Date(b.scheduledDate || b.date || 0);
    const isActiveStatus = b.status === "pending" || b.status === "confirmed";
    return !isActiveStatus || bookingDate < today();
  });

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
                {tabKey === "upcoming"
                  ? `Kelayotgan (${upcoming.length})`
                  : `O'tgan (${past.length})`}
              </Text>
            </TouchableOpacity>
          ))}
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
        {list.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="calendar" size={48} color={Colors.textSecondary} />
            <Text style={styles.emptyTitle}>
              {tab === "upcoming"
                ? "Hozircha faol bronlar yo'q"
                : "O'tgan bronlar yo'q"}
            </Text>
            {tab === "upcoming" && (
              <Text style={styles.emptyHint}>
                Zal tanlang va bron qiling
              </Text>
            )}
          </View>
        ) : (
          list.map((booking: any) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onScan={
                (booking.status === "pending" || booking.status === "confirmed")
                  ? () => router.push("/(tabs)/scanner" as any)
                  : undefined
              }
              onCancel={
                (booking.status === "pending" || booking.status === "confirmed")
                  ? () => confirmCancel(booking)
                  : undefined
              }
            />
          ))
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
  emptyState: {
    alignItems: "center",
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  emptyHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    opacity: 0.7,
  },
});
