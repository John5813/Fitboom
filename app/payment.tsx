import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  getPaymentConfig,
  purchaseCredits,
  getPaymentStatus,
  type PaymentStatusResponse,
} from "@/services/api";
import Colors from "@/constants/Colors";

const FALLBACK_PACKAGES = [
  { credits: 60, price: 60000, priceFormatted: "60 000 so'm" },
  { credits: 130, price: 130000, priceFormatted: "130 000 so'm" },
  { credits: 240, price: 240000, priceFormatted: "240 000 so'm" },
];

type Step = "select" | "receipt" | "pending" | "done" | "rejected";

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const { user, refetchUser } = useAuth();
  const { t } = useLanguage();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<Step>("select");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<PaymentStatusResponse | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: configData } = useQuery({
    queryKey: ["/credits"],
    queryFn: getPaymentConfig,
  });

  const PACKAGES = configData?.packages?.length ? configData.packages : FALLBACK_PACKAGES;
  const currentPkg = selectedPkg || PACKAGES[1] || PACKAGES[0];

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startPolling = (pid: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const data = await getPaymentStatus(pid);
        setStatusData(data);
        if (data.status === "approved") {
          if (pollRef.current) clearInterval(pollRef.current);
          setStep("done");
          refetchUser();
        } else if (data.status === "rejected") {
          if (pollRef.current) clearInterval(pollRef.current);
          setStep("rejected");
        }
      } catch {
        /* polling xatosi — davom et */
      }
    }, 5000);
  };

  const pickReceipt = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Ruxsat kerak", "Rasmlar kutubxonasiga ruxsat bering");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Ruxsat kerak", "Kameraga ruxsat bering");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const handleSendReceipt = async () => {
    if (!receiptUri) {
      Alert.alert("Chek rasmi", "Iltimos, chek rasmini tanlang");
      return;
    }
    setUploading(true);
    try {
      const data = await purchaseCredits(
        currentPkg.credits,
        receiptUri,
        currentPkg.price
      );
      setPaymentId(data.paymentId);
      setStep("pending");
      startPolling(data.paymentId);
    } catch (err: any) {
      Alert.alert("Xatolik", err?.message || "Chekni yuborishda xatolik yuz berdi");
    } finally {
      setUploading(false);
    }
  };

  if (step === "done") {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={styles.successCircle}>
          <Feather name="check" size={48} color="#fff" />
        </View>
        <Text style={styles.successTitle}>To'lovingiz tasdiqlandi!</Text>
        <Text style={styles.successBalance}>
          Yangi balans: {statusData?.currentBalance ?? user?.credits ?? 0} kredit
        </Text>
        <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
          <Text style={styles.doneBtnText}>Bosh sahifaga qaytish</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === "rejected") {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={[styles.successCircle, { backgroundColor: Colors.error }]}>
          <Feather name="x" size={48} color="#fff" />
        </View>
        <Text style={styles.successTitle}>To'lov rad etildi</Text>
        <Text style={styles.successBalance}>
          {statusData?.currentBalance !== undefined
            ? `Joriy balans: ${statusData.currentBalance} kredit`
            : "Admin to'lovni rad etdi"}
        </Text>
        <TouchableOpacity
          style={[styles.doneBtn, { backgroundColor: Colors.error }]}
          onPress={() => {
            setStep("select");
            setReceiptUri(null);
            setPaymentId(null);
          }}
        >
          <Text style={styles.doneBtnText}>Qayta urinish</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === "pending") {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.pendingTitle}>Admin tasdiqlamoqda...</Text>
        <Text style={styles.pendingSubtitle}>
          {currentPkg.credits} kredit uchun chek yuborildi.{"\n"}
          Telegram orqali tasdiqlanishi kutilmoqda.
        </Text>
        <Text style={styles.pendingHint}>Bu sahifani yopmang</Text>
      </View>
    );
  }

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

        {step === "select" && (
          <>
            <Text style={styles.sectionTitle}>Paket tanlang</Text>
            <View style={styles.packages}>
              {PACKAGES.map((pkg: any) => {
                const isActive = currentPkg.credits === pkg.credits;
                return (
                  <TouchableOpacity
                    key={pkg.credits}
                    style={[
                      styles.packageCard,
                      isActive && styles.packageCardActive,
                    ]}
                    onPress={() => setSelectedPkg(pkg)}
                  >
                    <Feather
                      name="key"
                      size={20}
                      color={isActive ? "#fff" : Colors.primary}
                    />
                    <Text
                      style={[styles.packageCredits, isActive && styles.packageCreditsActive]}
                    >
                      {pkg.credits}
                    </Text>
                    <Text style={[styles.packageLabel, isActive && { color: "rgba(255,255,255,0.8)" }]}>
                      kredit
                    </Text>
                    <Text style={[styles.packagePrice, isActive && { color: "#fff" }]}>
                      {pkg.priceFormatted || `${((pkg.price || 0) / 1000).toFixed(0)}K so'm`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.nextBtn}
              onPress={() => setStep("receipt")}
            >
              <Text style={styles.nextBtnText}>Davom etish</Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </TouchableOpacity>
          </>
        )}

        {step === "receipt" && (
          <>
            <View style={styles.selectedPkgCard}>
              <Feather name="key" size={20} color={Colors.primary} />
              <Text style={styles.selectedPkgText}>
                {currentPkg.credits} kredit —{" "}
                {currentPkg.priceFormatted || `${((currentPkg.price || 0) / 1000).toFixed(0)}K so'm`}
              </Text>
              <TouchableOpacity onPress={() => setStep("select")}>
                <Text style={styles.changePkg}>O'zgartirish</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.instructionCard}>
              <Text style={styles.instructionTitle}>To'lov ko'rsatmalari</Text>
              <Text style={styles.instructionText}>
                1. Quyidagi karta raqamiga{" "}
                <Text style={styles.instructionHighlight}>
                  {currentPkg.priceFormatted || `${(currentPkg.price || 0).toLocaleString()} so'm`}
                </Text>{" "}
                o'tkazing.{"\n"}
                2. To'lov chekining rasmini oling.{"\n"}
                3. Chek rasmini yuborasiz — admin Telegram orqali tasdiqlaydi.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Chek rasmi</Text>

            {receiptUri ? (
              <View style={styles.receiptPreview}>
                <Image
                  source={{ uri: receiptUri }}
                  style={styles.receiptImage}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.removeReceipt}
                  onPress={() => setReceiptUri(null)}
                >
                  <Feather name="x" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.pickRow}>
                <TouchableOpacity style={styles.pickBtn} onPress={pickReceipt}>
                  <Feather name="image" size={22} color={Colors.primary} />
                  <Text style={styles.pickBtnText}>Galereya</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pickBtn} onPress={takePhoto}>
                  <Feather name="camera" size={22} color={Colors.primary} />
                  <Text style={styles.pickBtnText}>Kamera</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[styles.uploadBtn, (uploading || !receiptUri) && { opacity: 0.6 }]}
              onPress={handleSendReceipt}
              disabled={uploading || !receiptUri}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="send" size={18} color="#fff" />
                  <Text style={styles.uploadBtnText}>Chekni yuborish</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContent: { alignItems: "center", justifyContent: "center", gap: 16, padding: 32 },
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
  title: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  content: { padding: 16, gap: 20 },
  balanceCard: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  balanceAmount: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text },
  packages: { flexDirection: "row", gap: 10 },
  packageCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 6,
    borderWidth: 2,
    borderColor: Colors.cardBorder,
  },
  packageCardActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  packageCredits: { fontSize: 28, fontFamily: "Inter_700Bold", color: Colors.text, lineHeight: 32 },
  packageCreditsActive: { color: "#fff" },
  packageLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  packagePrice: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.primary, marginTop: 2, textAlign: "center" },
  nextBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  nextBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  selectedPkgCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectedPkgText: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  changePkg: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.primary },
  instructionCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  instructionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text },
  instructionText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 22 },
  instructionHighlight: { color: Colors.primary, fontFamily: "Inter_700Bold" },
  pickRow: { flexDirection: "row", gap: 12 },
  pickBtn: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: "dashed",
  },
  pickBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.primary },
  receiptPreview: {
    borderRadius: 14,
    overflow: "hidden",
    height: 200,
    position: "relative",
  },
  receiptImage: { width: "100%", height: "100%" },
  removeReceipt: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    padding: 4,
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
  uploadBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "center" },
  successBalance: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textSecondary, textAlign: "center" },
  doneBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 8,
  },
  doneBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  pendingTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "center", marginTop: 16 },
  pendingSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, textAlign: "center", lineHeight: 22 },
  pendingHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, textAlign: "center", marginTop: 8 },
});
