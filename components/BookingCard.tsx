import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import { useLanguage } from "@/contexts/LanguageContext";

interface BookingCardProps {
  booking: any;
  compact?: boolean;
  onScan?: () => void;
  onCancel?: () => void;
}

function getStatusInfo(status: string) {
  switch (status) {
    case "pending":
      return { label: "Kutilmoqda", bg: "rgba(245,158,11,0.12)", text: "#f59e0b" };
    case "completed":
      return { label: "Tashrif buyurildi", bg: "rgba(16,185,129,0.12)", text: "#10b981" };
    case "missed":
      return { label: "Kelmadi", bg: "rgba(239,68,68,0.07)", text: "#f97316" };
    case "cancelled":
      return { label: "Bekor qilindi", bg: "rgba(239,68,68,0.1)", text: Colors.error };
    default:
      return { label: status, bg: Colors.surface, text: Colors.textSecondary };
  }
}

export default function BookingCard({
  booking,
  compact,
  onScan,
  onCancel,
}: BookingCardProps) {
  const { t } = useLanguage();

  const gymName = booking.gym?.name || booking.gymName || "Sport zal";
  const gymAddress = booking.gym?.address || booking.address || "";

  const startTime = booking.scheduledStartTime || booking.time || booking.startTime || "";
  const endTime = booking.scheduledEndTime || booking.endTime || "";

  const dateStr = booking.scheduledDate || booking.date
    ? new Date(booking.scheduledDate || booking.date).toLocaleDateString("uz-UZ", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : "";

  const isActive = booking.status === "pending";
  const statusInfo = getStatusInfo(booking.status || "pending");

  const stripeColor =
    booking.status === "pending" ? "#f59e0b" :
    booking.status === "completed" ? "#10b981" :
    booking.status === "cancelled" ? Colors.error :
    booking.status === "missed" ? "#f97316" :
    Colors.textSecondary;

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={[styles.leftStripe, { backgroundColor: stripeColor }]} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.gymInfo}>
            <Text style={styles.gymName} numberOfLines={1}>{gymName}</Text>
            {gymAddress ? (
              <View style={styles.addressRow}>
                <Feather name="map-pin" size={11} color={Colors.textSecondary} />
                <Text style={styles.addressText} numberOfLines={1}>{gymAddress}</Text>
              </View>
            ) : null}
            <View style={styles.dateRow}>
              <Feather name="calendar" size={12} color={Colors.textSecondary} />
              <Text style={styles.dateText}>{dateStr}</Text>
              {startTime ? (
                <>
                  <Feather name="clock" size={12} color={Colors.textSecondary} />
                  <Text style={styles.dateText}>
                    {startTime}{endTime ? ` - ${endTime}` : ""}
                  </Text>
                </>
              ) : null}
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
            <Text style={[styles.statusText, { color: statusInfo.text }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {booking.creditsUsed !== undefined && (
          <View style={styles.creditsRow}>
            <Feather name="key" size={12} color={Colors.primary} />
            <Text style={styles.creditsText}>
              {booking.creditsUsed} kredit ishlatildi
            </Text>
          </View>
        )}

        {!compact && isActive && (
          <View style={styles.actions}>
            {onScan && (
              <TouchableOpacity style={styles.qrBtn} onPress={onScan}>
                <Feather name="camera" size={14} color="#fff" />
                <Text style={styles.qrBtnText}>Skaner</Text>
              </TouchableOpacity>
            )}
            {onCancel && (
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                <Text style={styles.cancelBtnText}>{t("bookings.cancel")}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardCompact: { borderRadius: 12 },
  leftStripe: {
    width: 4,
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
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
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
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
    alignSelf: "flex-start",
  },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  creditsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  creditsText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.primary,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  qrBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  qrBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(239,68,68,0.3)",
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.error,
  },
});
