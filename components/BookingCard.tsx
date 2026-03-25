import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import { useLanguage } from "@/contexts/LanguageContext";

interface BookingCardProps {
  booking: any;
  compact?: boolean;
  onShowQR?: () => void;
  onCancel?: () => void;
}

export default function BookingCard({
  booking,
  compact,
  onShowQR,
  onCancel,
}: BookingCardProps) {
  const { t } = useLanguage();

  const dateStr = booking.scheduledDate
    ? new Date(booking.scheduledDate).toLocaleDateString("uz-UZ", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : "";

  const isUpcoming = booking.status === "confirmed";

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.leftStripe} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.gymInfo}>
            <Text style={styles.gymName} numberOfLines={1}>
              {booking.gymName || "Sport zal"}
            </Text>
            <View style={styles.dateRow}>
              <Feather name="calendar" size={12} color={Colors.textSecondary} />
              <Text style={styles.dateText}>{dateStr}</Text>
              {booking.startTime && (
                <>
                  <Feather name="clock" size={12} color={Colors.textSecondary} />
                  <Text style={styles.dateText}>
                    {booking.startTime}
                    {booking.endTime ? ` - ${booking.endTime}` : ""}
                  </Text>
                </>
              )}
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              isUpcoming ? styles.statusActive : styles.statusPast,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                isUpcoming ? styles.statusActiveText : styles.statusPastText,
              ]}
            >
              {isUpcoming ? "Faol" : "O'tgan"}
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

        {!compact && isUpcoming && (
          <View style={styles.actions}>
            {onShowQR && (
              <TouchableOpacity style={styles.qrBtn} onPress={onShowQR}>
                <Feather name="maximize" size={14} color="#fff" />
                <Text style={styles.qrBtnText}>{t("bookings.show_qr")}</Text>
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
  gymInfo: { flex: 1, gap: 4 },
  gymName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
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
    marginLeft: 8,
  },
  statusActive: { backgroundColor: Colors.primaryLight },
  statusPast: { backgroundColor: Colors.surface },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  statusActiveText: { color: Colors.primary },
  statusPastText: { color: Colors.textSecondary },
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
