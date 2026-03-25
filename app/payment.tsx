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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/api";
import Colors from "@/constants/Colors";

const PACKAGES = [
  { credits: 6, price: 120000, label: "Boshlang'ich" },
  { credits: 13, price: 250000, label: "Mashhur", popular: true },
  { credits: 24, price: 450000, label: "Premium" },
];

const CARD_NUMBER = "9860 1234 5678 9012";

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const { user, refetchUser } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedPkg, setSelectedPkg] = useState(PACKAGES[1]);
  const [uploading, setUploading] = useState(false);
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const { data: settingsData } = useQuery({
    queryKey: ["/api/admin/settings"],
    queryFn: () => apiRequest("/api/admin/settings"),
  });

  const cardNumber =
    settingsData?.settings?.find((s: any) => s.settingKey === "payment_card")
      ?.settingValue || CARD_NUMBER;

  const copyCard = () => {
    Clipboard.setString(cardNumber.replace(/\s/g, ""));
    Alert.alert("Nusxa olindi", "Karta raqami nusxa olindi");
  };

  const uploadReceipt = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("common.error"), "Rasm kiritishga ruxsat berilmadi");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("receipt", {
        uri: result.assets[0].uri,
        type: "image/jpeg",
        name: "receipt.jpg",
      } as any);
      formData.append("credits", String(selectedPkg.credits));
      formData.append("price", String(selectedPkg.price));

      const baseUrl = process.env.EXPO_PUBLIC_DOMAIN
        ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
        : "";

      const res = await fetch(`${baseUrl}/api/payments/upload-receipt`, {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.ok) {
        Alert.alert(
          t("common.success"),
          t("payment.receipt_sent"),
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        throw new Error("Upload failed");
      }
    } catch (err: any) {
      Alert.alert(t("common.error"), "Chekni yuborishda xatolik yuz berdi");
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
        {/* Current Balance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Joriy balans</Text>
          <Text style={styles.balanceAmount}>
            {user?.credits ?? 0} {t("profile.credits")}
          </Text>
        </View>

        {/* Package Selection */}
        <Text style={styles.sectionTitle}>Paket tanlang</Text>
        <View style={styles.packages}>
          {PACKAGES.map((pkg) => (
            <TouchableOpacity
              key={pkg.credits}
              style={[
                styles.packageCard,
                selectedPkg.credits === pkg.credits && styles.packageCardActive,
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
                  color={selectedPkg.credits === pkg.credits ? "#fff" : Colors.primary}
                />
              </View>
              <Text
                style={[
                  styles.packageCredits,
                  selectedPkg.credits === pkg.credits && styles.packageCreditsActive,
                ]}
              >
                {pkg.credits}
              </Text>
              <Text
                style={[
                  styles.packageLabel,
                  selectedPkg.credits === pkg.credits && { color: "rgba(255,255,255,0.8)" },
                ]}
              >
                kredit
              </Text>
              <Text
                style={[
                  styles.packagePrice,
                  selectedPkg.credits === pkg.credits && { color: "#fff" },
                ]}
              >
                {(pkg.price / 1000).toFixed(0)}K so'm
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment Instructions */}
        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>To'lov ko'rsatmalari</Text>
          <Text style={styles.instructionText}>
            Quyidagi karta raqamiga{" "}
            <Text style={styles.instructionHighlight}>
              {selectedPkg.price.toLocaleString()} so'm
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
              {selectedPkg.price.toLocaleString()} so'm
            </Text>
          </View>
        </View>

        {/* Upload Receipt */}
        <TouchableOpacity
          style={[styles.uploadBtn, uploading && { opacity: 0.7 }]}
          onPress={uploadReceipt}
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
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
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
    borderColor: Colors.border,
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
    borderColor: Colors.border,
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
    backgroundColor: Colors.background,
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
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  uploadBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
