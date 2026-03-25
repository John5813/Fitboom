import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/api";
import Colors from "@/constants/Colors";

type Step = "phone" | "code";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { user, isLoading, refetchUser } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("+998");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!isLoading && user) {
      if (user.profileCompleted) {
        router.replace("/(tabs)" as any);
      } else {
        router.replace("/complete-profile" as any);
      }
    }
  }, [user, isLoading]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const sendCode = async () => {
    if (phone.length < 7) {
      Alert.alert(t("common.error"), "Telefon raqamni kiriting");
      return;
    }
    router.replace("/(tabs)" as any);
  };

  const verifyCode = async () => {
    router.replace("/(tabs)" as any);
  };

  return (
    <LinearGradient
      colors={["#0B7A8C", "#085F6E", "#063F4A"]}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inner}
      >
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>FB</Text>
          </View>
          <Text style={styles.appName}>{t("app.name")}</Text>
          <Text style={styles.subtitle}>{t("auth.subtitle")}</Text>
        </View>

        <View style={styles.card}>
          {step === "phone" ? (
            <>
              <Text style={styles.cardTitle}>{t("auth.phone_label")}</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder={t("auth.phone_placeholder")}
                placeholderTextColor="#AAB8BD"
                keyboardType="phone-pad"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={sendCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>{t("auth.send_code")}</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>{t("auth.code_label")}</Text>
              <Text style={styles.codeHint}>
                {phone} ga kod yuborildi
              </Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                value={code}
                onChangeText={setCode}
                placeholder={t("auth.code_placeholder")}
                placeholderTextColor="#AAB8BD"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={verifyCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>{t("auth.verify")}</Text>
                )}
              </TouchableOpacity>
              <View style={styles.resendRow}>
                <TouchableOpacity
                  onPress={() => setStep("phone")}
                  style={styles.backBtn}
                >
                  <Text style={styles.backBtnText}>{t("auth.back")}</Text>
                </TouchableOpacity>
                {countdown > 0 ? (
                  <Text style={styles.countdownText}>{countdown}s</Text>
                ) : (
                  <TouchableOpacity onPress={sendCode}>
                    <Text style={styles.resendText}>{t("auth.resend")}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 32,
  },
  logoSection: {
    alignItems: "center",
    gap: 12,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  logoText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  appName: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#1A2E35",
  },
  codeHint: {
    fontSize: 13,
    color: "#6B8A94",
    fontFamily: "Inter_400Regular",
    marginTop: -8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#DDE8EC",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#1A2E35",
    backgroundColor: "#F8FAFB",
  },
  codeInput: {
    fontSize: 22,
    textAlign: "center",
    letterSpacing: 8,
    fontFamily: "Inter_600SemiBold",
  },
  button: {
    backgroundColor: "#0B7A8C",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backBtn: { padding: 4 },
  backBtnText: {
    color: "#6B8A94",
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  countdownText: {
    color: "#6B8A94",
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  resendText: {
    color: "#0B7A8C",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
