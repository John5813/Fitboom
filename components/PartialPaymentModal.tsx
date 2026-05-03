import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useLanguage } from "@/contexts/LanguageContext";
import { getAccessToken } from "@/services/api";

const BASE_URL = "https://fitboom-absdefgx7.replit.app/api/mobile/v1";

const CARD_NUMBER = "9860 1701 1740 5213";
const CARD_OWNER = "FitBoom To'lov";

interface Props {
  visible: boolean;
  onClose: () => void;
  paymentId: string;
  remainingAmount: number;
  credits: number;
  onSuccess?: () => void;
}

export default function PartialPaymentModal({
  visible,
  onClose,
  paymentId,
  remainingAmount,
  credits,
  onSuccess,
}: Props) {
  const { t } = useLanguage();
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyCard = async () => {
    await Clipboard.setStringAsync(CARD_NUMBER.replace(/\s/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pickReceipt = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("common.error"), "Rasm kutubxonasiga ruxsat kerak");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("common.error"), "Kameraga ruxsat kerak");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const submitReceipt = async () => {
    if (!receiptUri) {
      Alert.alert(t("common.error"), "Iltimos, chek rasmini tanlang");
      return;
    }
    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Token topilmadi");

      const formData = new FormData();
      formData.append("receipt", {
        uri: receiptUri,
        type: "image/jpeg",
        name: "receipt.jpg",
      } as any);
      formData.append("paymentId", paymentId);
      formData.append("credits", String(credits));
      formData.append("price", String(remainingAmount));

      const res = await fetch(`${BASE_URL}/credits/purchase`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const json = await res.json();
      if (!res.ok && res.status !== 200) {
        throw new Error(json?.error || json?.message || "Xatolik yuz berdi");
      }

      Alert.alert(
        "✅ Chek yuborildi",
        "Chekingiz qabul qilindi. Admin tekshirgach to'lov tasdiqlandi.",
        [{ text: "OK", onPress: () => { onSuccess?.(); onClose(); } }]
      );
    } catch (err: any) {
      if (err?.message === "Token topilmadi") {
        Alert.alert(t("common.error"), "Iltimos qayta kiring");
      } else {
        Alert.alert(t("common.error"), err?.message || "Chek yuborishda xatolik");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setReceiptUri(null);
    setCopied(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Feather name="x" size={22} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Qoldiq to'lov</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.amountCard}>
            <View style={styles.amountIconBox}>
              <Feather name="alert-circle" size={28} color="#fff" />
            </View>
            <Text style={styles.amountLabel}>To'lash kerak bo'lgan summa</Text>
            <Text style={styles.amountValue}>
              {Number(remainingAmount).toLocaleString()} so'm
            </Text>
            <Text style={styles.amountCredits}>
              {credits} kredit uchun qolgan qarz
            </Text>
          </View>

          <View style={styles.instructionBox}>
            <Feather name="info" size={16} color="#1d4ed8" style={{ marginTop: 2 }} />
            <Text style={styles.instructionText}>
              Quyidagi karta raqamiga{" "}
              <Text style={styles.instructionBold}>
                {Number(remainingAmount).toLocaleString()} so'm
              </Text>{" "}
              o'tkazing, so'ng chek rasmini yuboring va to'lovni yakunlang.
            </Text>
          </View>

          <View style={styles.cardBox}>
            <View style={styles.cardBoxHeader}>
              <Feather name="credit-card" size={18} color="#374151" />
              <Text style={styles.cardBoxTitle}>Karta raqami</Text>
            </View>
            <View style={styles.cardNumberRow}>
              <Text style={styles.cardNumber}>{CARD_NUMBER}</Text>
              <TouchableOpacity
                style={[styles.copyBtn, copied && styles.copyBtnDone]}
                onPress={copyCard}
                activeOpacity={0.7}
              >
                <Feather
                  name={copied ? "check" : "copy"}
                  size={16}
                  color={copied ? "#16a34a" : "#6b7280"}
                />
                <Text style={[styles.copyText, copied && styles.copyTextDone]}>
                  {copied ? "Nusxalandi!" : "Nusxalash"}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.cardOwner}>{CARD_OWNER}</Text>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>Chek yuborish</Text>
            <View style={styles.divider} />
          </View>

          {receiptUri ? (
            <View style={styles.receiptPreview}>
              <Image
                source={{ uri: receiptUri }}
                style={styles.receiptImage}
                contentFit="cover"
              />
              <TouchableOpacity
                style={styles.changeReceiptBtn}
                onPress={pickReceipt}
              >
                <Feather name="refresh-cw" size={14} color="#1d4ed8" />
                <Text style={styles.changeReceiptText}>Rasmni almashtirish</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.receiptPickerRow}>
              <TouchableOpacity
                style={styles.pickBtn}
                onPress={pickReceipt}
                activeOpacity={0.8}
              >
                <Feather name="image" size={22} color="#374151" />
                <Text style={styles.pickBtnText}>Galereyadan</Text>
              </TouchableOpacity>
              <View style={styles.pickDivider} />
              <TouchableOpacity
                style={styles.pickBtn}
                onPress={takePhoto}
                activeOpacity={0.8}
              >
                <Feather name="camera" size={22} color="#374151" />
                <Text style={styles.pickBtnText}>Kamera</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!receiptUri || submitting) && styles.submitBtnDisabled,
            ]}
            onPress={submitReceipt}
            disabled={!receiptUri || submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="send" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Chek yuborish va yakunlash</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            Chek tekshirilgach adminlar tomonidan tasdiqlanadi va kredit hisobingizga qo'shiladi.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#111" },
  closeBtn: { padding: 4 },
  scrollContent: { padding: 20, gap: 16, paddingBottom: 40 },

  amountCard: {
    backgroundColor: "#b91c1c",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    gap: 8,
    shadowColor: "#b91c1c",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  amountIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  amountLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.85)",
  },
  amountValue: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.5,
  },
  amountCredits: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },

  instructionBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#1e40af",
    lineHeight: 21,
  },
  instructionBold: { fontFamily: "Inter_700Bold" },

  cardBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  cardBoxTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#374151",
  },
  cardNumberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardNumber: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#111827",
    letterSpacing: 2,
    flex: 1,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  copyBtnDone: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  copyText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#6b7280",
  },
  copyTextDone: { color: "#16a34a" },
  cardOwner: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#6b7280",
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 4,
  },
  divider: { flex: 1, height: 1, backgroundColor: "#e5e7eb" },
  dividerText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#9ca3af",
  },

  receiptPickerRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
    overflow: "hidden",
  },
  pickBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 28,
  },
  pickBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#374151",
  },
  pickDivider: { width: 1, backgroundColor: "#e5e7eb" },

  receiptPreview: {
    borderRadius: 14,
    overflow: "hidden",
    gap: 10,
  },
  receiptImage: {
    width: "100%",
    height: 200,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
  },
  changeReceiptBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "#eff6ff",
    borderRadius: 10,
  },
  changeReceiptText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#1d4ed8",
  },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#b91c1c",
    borderRadius: 14,
    paddingVertical: 17,
    shadowColor: "#b91c1c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  submitBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },

  footerNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 8,
  },
});
