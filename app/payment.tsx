import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Clipboard,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getPaymentConfig, uploadReceipt } from "@/services/api";
import Colors from "@/constants/Colors";

const FALLBACK_PACKAGES = [
  { credits: 6, priceUzs: 120000, label: "Boshlang'ich" },
  { credits: 13, priceUzs: 250000, label: "Mashhur", popular: true },
  { credits: 24, priceUzs: 450000, label: "Premium" },
];

const FALLBACK_CARD = "9860 1234 5678 9012";

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const { data: configData } = useQuery({
    queryKey: ["payment-config"],
    queryFn: getPaymentConfig,
  });

  const PACKAGES = configData?.packages || FALLBACK_PACKAGES;
  const cardNumber = configData?.cardNumber || FALLBACK_CARD;
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const currentPkg = selectedPkg || PACKAGES[1] || PACKAGES[0];

  const copyCard = () => {
    Clipboard.setString(cardNumber.replace(/\s/g, ""));
    Alert.alert("Nusxa olindi", "Karta raqami nusxa olindi");
  };

  const handleUploadReceipt = async () => {
    setUploading(true);
    try {
      await uploadReceipt({
        amountCredits: currentPkg.credits,
        amountUzs: currentPkg.priceUzs || currentPkg.price,
      });
      Alert.alert(
        t("common.success"),
        t("payment.receipt_sent"),
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert(t("common.error"), err?.message || "Chekni yuborishda xatolik yuz berdi");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("payment.title")}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Joriy balans</Text>
          <Text style={styles.balanceAmount}>
            {user?.credits ?? 0} {t("profile.credits")}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Paket tanlang</Text>
        <View style={styles.packages}>
          {PACKAGES.map((pkg: any) => {
            const isActive = currentPkg.credits === pkg.credits;
            const price = pkg.priceUzs || pkg.price;
            return (
              <TouchableOpacity
                key={pkg.credits}
                style={[
                  styles.packageCard,
                  isActive && styles.packageCardActive,
                  pkg.popular && styles.packageCardPopular,
                ]}
                onPress={() => setSelectedPkg(pkg)}
              >
                {pkg.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>Mashhur</Text>
                  </View>
                )}
                <View style={styles.packageIconRow}>
                  <Feather
                    name="key"
                    size={20}
                    color={isActive ? "#fff" : Colors.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.packageCredits,
                    isActive && styles.packageCreditsActive,
                  ]}
                >
                  {pkg.credits}
                </Text>
                <Text
                  style={[
                    styles.packageLabel,
                    isActive && { color: "rgba(255,255,255,0.8)" },
                  ]}
                >
                  kredit
                </Text>
                <Text
                  style={[
                    styles.packagePrice,
                    isActive && { color: "#fff" },
                  ]}
                >
                  {((price) / 1000).toFixed(0)}K so'm
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>To'lov ko'rsatmalari</Text>
          <Text style={styles.instructionText}>
            Quyidagi karta raqamiga{" "}
            <Text style={styles.instructionHighlight}>
              {(currentPkg.priceUzs || currentPkg.price || 0).toLocaleString()} so'm
            </Text>{" "}
            o'tkazing va chek rasmini yuboring.
          </Text>

          <TouchableOpacity style={styles.cardRow} onPress={copyCard}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardLabel}>{t("payment.card_number")}</Text>
              <Text style={styles.cardNumber}>{cardNumber}</Text>
            </View>
            <View style={styles.copyBtn}>
              <Feather name="copy" size={16} color={Colors.primary} />
            </View>
          </TouchableOpacity>

          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Miqdor:</Text>
            <Text style={styles.amountValue}>
              {(currentPkg.priceUzs || currentPkg.price || 0).toLocaleString()} so'm
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.uploadBtn, uploading && { opacity: 0.7 }]}
          onPress={handleUploadReceipt}
          disabled={uploading}
        >
          <Feather name={uploading ? "loader" : "upload"} size={20} color="#fff" />
          <Text style={styles.uploadBtnText}>
            {uploading ? t("payment.uploading") : t("payment.send_receipt")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.card,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  content: { padding: 16, gap: 20 },
  balanceCard: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  balanceAmount: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  packages: { flexDirection: "row", gap: 12 },
  packageCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 6,
    borderWidth: 2,
    borderColor: Colors.cardBorder,
    position: "relative",
    overflow: "hidden",
  },
  packageCardActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  packageCardPopular: { borderColor: Colors.primary },
  popularBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderBottomLeftRadius: 10,
  },
  popularBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  packageIconRow: { marginTop: 8 },
  packageCredits: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    lineHeight: 36,
  },
  packageCreditsActive: { color: "#fff" },
  packageLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  packagePrice: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
    marginTop: 4,
  },
  instructionCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  instructionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  instructionText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  instructionHighlight: {
    color: Colors.primary,
    fontFamily: "Inter_700Bold",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardInfo: { flex: 1 },
  cardLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  cardNumber: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: 2,
    marginTop: 3,
  },
  copyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  amountValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  uploadBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  uploadBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
