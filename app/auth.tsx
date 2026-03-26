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
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Colors from "@/constants/Colors";

type Step = "welcome" | "phone" | "code";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { user, isLoading, login } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>("welcome");
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
    setLoading(true);
    try {
      const { sendSmsCode } = await import("@/services/api");
      await sendSmsCode(phone);
    } catch {
      // still show code input - in dev the code is printed to server logs
    } finally {
      setLoading(false);
    }
    setStep("code");
    setCountdown(60);
  };

  const verifyCode = async () => {
    if (code.length < 4) {
      Alert.alert(t("common.error"), "Tasdiqlash kodini kiriting");
      return;
    }

    setLoading(true);
    try {
      await login({ phone, code });
    } catch (error: any) {
      Alert.alert(t("common.error"), error?.message || "Kirishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  if (step === "welcome") {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <View style={styles.welcomeContent}>
          <View style={styles.logoRow}>
            <LinearGradient
              colors={["#fb923c", "#f97316"]}
              style={styles.logoIcon}
            >
              <Feather name="zap" size={28} color="#fff" />
            </LinearGradient>
            <Text style={styles.logoText}>
              <Text style={{ color: "#fff" }}>Fit</Text>
              <Text style={{ color: Colors.primary }}>Boom</Text>
            </Text>
          </View>

          <View style={styles.headlineBox}>
            <Text style={styles.headline}>
              Sport zallariga{"\n"}
              <Text style={styles.headlineOrange}>bir kredit bilan</Text>
            </Text>
            <Text style={styles.heroDesc}>
              Toshkent bo'ylab eng yaxshi fitness zallarini bir joyda toping, bron qiling va kiring.
            </Text>
          </View>

          <View style={styles.pillsRow}>
            {[
              { icon: "map-pin" as const, label: "Toshkent bo'ylab" },
              { icon: "zap" as const, label: "Tezkor bron" },
              { icon: "camera" as const, label: "QR kirish" },
            ].map((p) => (
              <View key={p.label} style={styles.pill}>
                <Feather name={p.icon} size={12} color="rgba(255,255,255,0.8)" />
                <Text style={styles.pillText}>{p.label}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => setStep("phone")}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#f97316", "#fb923c"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.startBtnGrad}
            >
              <Text style={styles.startBtnText}>Boshlash</Text>
              <Feather name="arrow-right" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.freeText}>
            Ro'yxatdan o'tish bepul · 30 soniyada tayyor
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.authInner}
      >
        <TouchableOpacity
          style={styles.backRow}
          onPress={() => setStep("welcome")}
        >
          <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.7)" />
          <Text style={styles.backText}>{t("common.back")}</Text>
        </TouchableOpacity>

        <View style={styles.authLogoRow}>
          <LinearGradient
            colors={["#fb923c", "#f97316"]}
            style={styles.authLogoIcon}
          >
            <Feather name="zap" size={20} color="#fff" />
          </LinearGradient>
          <Text style={styles.authLogoText}>
            <Text style={{ color: "#fff" }}>Fit</Text>
            <Text style={{ color: Colors.primary }}>Boom</Text>
          </Text>
        </View>

        <View style={styles.authCard}>
          {step === "phone" ? (
            <>
              <Text style={styles.cardTitle}>{t("auth.phone_label")}</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder={t("auth.phone_placeholder")}
                placeholderTextColor="rgba(255,255,255,0.3)"
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
                placeholderTextColor="rgba(255,255,255,0.3)"
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
                <TouchableOpacity onPress={() => setStep("phone")}>
                  <Text style={styles.linkText}>{t("auth.back")}</Text>
                </TouchableOpacity>
                {countdown > 0 ? (
                  <Text style={styles.countdownText}>{countdown}s</Text>
                ) : (
                  <TouchableOpacity onPress={sendCode}>
                    <Text style={[styles.linkText, { color: Colors.primary }]}>
                      {t("auth.resend")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  glowTop: {
    position: "absolute",
    top: -100,
    left: "30%",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.primaryLight,
  },
  glowBottom: {
    position: "absolute",
    bottom: -50,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(14,165,233,0.06)",
  },
  welcomeContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    gap: 28,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  headlineBox: {
    alignItems: "center",
    gap: 14,
  },
  headline: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  headlineOrange: {
    color: Colors.primary,
  },
  heroDesc: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 300,
  },
  pillsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  pillText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.75)",
  },
  startBtn: {
    width: "100%",
    maxWidth: 280,
    borderRadius: 16,
    overflow: "hidden",
  },
  startBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  startBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  freeText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.35)",
  },
  authInner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 24,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
  },
  authLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "center",
    marginBottom: 8,
  },
  authLogoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  authLogoText: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  authCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  codeHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    marginTop: -8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  codeInput: {
    fontSize: 22,
    textAlign: "center",
    letterSpacing: 8,
    fontFamily: "Inter_600SemiBold",
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.7 },
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
  linkText: {
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  countdownText: {
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
});
