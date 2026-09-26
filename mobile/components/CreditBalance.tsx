import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AlertTriangle, Clock } from "lucide-react-native";
import { useLanguage } from "@/contexts/LanguageContext";
import { Font, Gold, Radius } from "@/components/ui";

/*
 * Kredit balansi kartasi — vebdagi client/src/components/CreditBalance.tsx
 * bilan bir xil: yashil gradient (muddati o'tsa qizil), 🔑, sariq tugma.
 */

interface CreditBalanceProps {
  credits: number;
  creditExpiryDate?: string | null;
  onPurchase: () => void;
}

export default function CreditBalance({ credits, creditExpiryDate, onPurchase }: CreditBalanceProps) {
  const { t } = useLanguage();

  const remainingDays = creditExpiryDate
    ? Math.ceil((new Date(creditExpiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const isExpiringSoon = remainingDays !== null && remainingDays > 0 && remainingDays <= 5;
  const isExpired = remainingDays !== null && remainingDays <= 0;

  return (
    <LinearGradient
      colors={isExpired ? ["#ef4444", "#b91c1c"] : ["#4ade80", "#16a34a", "#166534"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <Text style={styles.key}>🔑</Text>

      <View style={styles.middle}>
        <Text style={styles.label}>{t("profile.credits_title")}</Text>
        <Text style={styles.balance} testID="credit-balance">
          {t("profile.credits_title")}: <Text style={styles.balanceNumber}>{credits}</Text>
        </Text>
        {remainingDays !== null && credits > 0 && (
          <View style={styles.daysRow}>
            {isExpired || isExpiringSoon ? (
              <AlertTriangle size={12} color="#FDE047" />
            ) : (
              <Clock size={12} color="rgba(255,255,255,0.7)" />
            )}
            <Text style={styles.daysText}>
              {isExpired
                ? t("profile.expired_message")
                : isExpiringSoon
                  ? `${t("profile.expiring_soon")} ${remainingDays} ${t("profile.days_left")}`
                  : `${remainingDays} ${t("profile.days_left")}`}
            </Text>
          </View>
        )}
      </View>

      <Pressable
        onPress={onPurchase}
        accessibilityRole="button"
        style={({ pressed }) => [styles.buttonShadow, pressed && { opacity: 0.9 }]}
        testID="button-topup-credits"
      >
        <LinearGradient
          colors={[...Gold.gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{isExpired ? t("profile.renew") : t("profile.topup")}</Text>
        </LinearGradient>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // rounded-2xl, px-4 py-4, gap-3, shadow-lg
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: Radius["2xl"],
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  key: { fontSize: 36 },
  middle: { flex: 1, minWidth: 0 },
  label: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: Font.medium },
  balance: { color: "#FFFFFF", fontSize: 20, lineHeight: 25, fontFamily: Font.bold },
  balanceNumber: { fontSize: 24 },
  daysRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  daysText: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: Font.regular },
  // h-10 rounded-xl, tilla gradient, to'q matn, shadow-md
  buttonShadow: {
    borderRadius: Radius.xl,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  button: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: Radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: Gold.text, fontSize: 14, fontFamily: Font.bold },
});
