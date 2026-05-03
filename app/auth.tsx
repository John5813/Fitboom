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
  Dimensions,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { sendSmsCode } from "@/services/api";
import Colors from "@/constants/Colors";

const { width } = Dimensions.get("window");

type Step = "welcome" | "phone" | "code" | "telegram";
type AuthMethod = "sms" | "telegram";

export default function AuthScreen() {
  const { user, isLoading, verifyOtp, verifyTelegram } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>("welcome");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("sms");
  const [phone, setPhone] = useState("+998");
  const [code, setCode] = useState("");
  const [telegramCode, setTelegramCode] = useState("");
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
      await sendSmsCode(phone);
    } catch {
      // SMS xato bo'lsa ham kod kiritish bosqichiga o'tamiz
    } finally {
      setLoading(false);
    }
    setStep("code");
    setCountdown(60);
  };

  const verifySms = async () => {
    if (code.length < 4) {
      Alert.alert(t("common.error"), "Tasdiqlash kodini kiriting");
      return;
    }
    setLoading(true);
    try {
      const { isNewUser } = await verifyOtp(phone, code);
      if (isNewUser) {
        router.replace("/complete-profile" as any);
      } else {
        router.replace("/(tabs)" as any);
      }
    } catch (error: any) {
      Alert.alert(t("common.error"), error?.message || "Kirishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const verifyTg = async () => {
    if (telegramCode.trim().length < 6) {
      Alert.alert(t("common.error"), "Telegram kodni kiriting");
      return;
    }
    setLoading(true);
    try {
      const { isNewUser } = await verifyTelegram(telegramCode.trim().toUpperCase());
      if (isNewUser) {
        router.replace("/complete-profile" as any);
      } else {
        router.replace("/(tabs)" as any);
      }
    } catch (error: any) {
      Alert.alert(t("common.error"), error?.message || "Kirishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  if (step === "welcome") {
    return (
      <LinearGradient
        colors={["#0a1f3c", "#0a2d1e", "#0d3a28"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradContainer}
      >
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />

          <View style={styles.welcomeContent}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.brandLogo}
              contentFit="contain"
            />

            <View style={styles.headlineBox}>
              <Text style={styles.headline}>
                Sport zallariga{"\n"}
                <Text style={styles.headlineAccent}>bir kredit bilan</Text>
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
                  <Feather name={p.icon} size={12} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.pillText}>{p.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.authMethodRow}>
              <TouchableOpacity
                style={[styles.methodBtn, authMethod === "sms" && styles.methodBtnActive]}
                onPress={() => setAuthMethod("sms")}
                activeOpacity={0.8}
              >
                <Feather
                  name="message-circle"
                  size={16}
                  color={authMethod === "sms" ? "#fff" : "rgba(255,255,255,0.65)"}
                />
                <Text style={[
                  styles.methodBtnText,
                  authMethod === "sms" && styles.methodBtnTextActive,
                ]}>
                  SMS orqali
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.methodBtn, authMethod === "telegram" && styles.methodBtnActive]}
                onPress={() => setAuthMethod("telegram")}
                activeOpacity={0.8}
              >
                <Feather
                  name="send"
                  size={16}
                  color={authMethod === "telegram" ? "#fff" : "rgba(255,255,255,0.65)"}
                />
                <Text style={[
                  styles.methodBtnText,
                  authMethod === "telegram" && styles.methodBtnTextActive,
                ]}>
                  Telegram orqali
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => setStep(authMethod === "sms" ? "phone" : "telegram")}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#16a34a", "#15803d"]}
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
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (step === "telegram") {
    return (
      <LinearGradient
        colors={["#0a1f3c", "#0a2d1e", "#0d3a28"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradContainer}
      >
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.authInner}
          >
            <TouchableOpacity style={styles.backRow} onPress={() => setStep("welcome")}>
              <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.8)" />
              <Text style={styles.backText}>{t("common.back")}</Text>
            </TouchableOpacity>

            <View style={styles.authLogoRow}>
              <Image
                source={require("@/assets/images/logo.png")}
                style={styles.authLogoIcon}
                contentFit="contain"
              />
              <Text style={styles.logoText}>
                <Text style={styles.logoFit}>Fit</Text>
                <Text style={styles.logoBoom}>Boom</Text>
              </Text>
            </View>

            <View style={styles.authCard}>
              <View style={styles.telegramInfo}>
                <Feather name="send" size={24} color="#38bdf8" />
                <Text style={styles.cardTitle}>Telegram orqali kirish</Text>
              </View>
              <Text style={styles.telegramDesc}>
                Quyidagi tugmani bosib botga o'ting, <Text style={styles.telegramBold}>/start</Text> yozing va bot bergan kodni kiriting.
              </Text>

              <TouchableOpacity
                style={styles.openBotBtn}
                onPress={() => Linking.openURL("https://t.me/uzfitboom_bot")}
                activeOpacity={0.85}
              >
                <Feather name="send" size={18} color="#fff" />
                <Text style={styles.openBotBtnText}>@uzfitboom_bot ga o'tish</Text>
                <Feather name="external-link" size={15} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>

              <TextInput
                style={[styles.input, styles.codeInput]}
                value={telegramCode}
                onChangeText={setTelegramCode}
                placeholder="AB12CD34"
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoCapitalize="characters"
                maxLength={8}
              />
              <TouchableOpacity
                style={[styles.button, (loading || telegramCode.length < 6) && styles.buttonDisabled]}
                onPress={verifyTg}
                disabled={loading || telegramCode.length < 6}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Tasdiqlash</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setAuthMethod("sms"); setStep("phone"); }}
                style={styles.switchLink}
              >
                <Text style={styles.switchLinkText}>SMS orqali kirish →</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#0a1f3c", "#0a2d1e", "#0d3a28"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradContainer}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.authInner}
        >
          <TouchableOpacity
            style={styles.backRow}
            onPress={() => setStep("welcome")}
          >
            <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.8)" />
            <Text style={styles.backText}>{t("common.back")}</Text>
          </TouchableOpacity>

          <View style={styles.authLogoRow}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.authLogoIcon}
              contentFit="contain"
            />
            <Text style={styles.logoText}>
              <Text style={styles.logoFit}>Fit</Text>
              <Text style={styles.logoBoom}>Boom</Text>
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
                  placeholderTextColor="rgba(255,255,255,0.35)"
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
                <TouchableOpacity
                  onPress={() => { setAuthMethod("telegram"); setStep("telegram"); }}
                  style={styles.switchLink}
                >
                  <Text style={styles.switchLinkText}>Telegram orqali kirish →</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>{t("auth.code_label")}</Text>
                <Text style={styles.codeHint}>
                  {phone} raqamiga SMS kod yuborildi
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
                  onPress={verifySms}
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
                      <Text style={[styles.linkText, { color: "#22c55e" }]}>
                        {t("auth.resend")}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradContainer: { flex: 1 },
  safeArea: { flex: 1 },

  decorCircle1: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(34,197,94,0.08)",
  },
  decorCircle2: {
    position: "absolute",
    bottom: -60,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(37,99,235,0.07)",
  },

  welcomeContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    gap: 26,
  },

  logoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandLogo: {
    width: 200,
    height: 200,
    marginBottom: 4,
  },
  logoIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: { fontSize: 30, fontFamily: "Inter_700Bold" },
  logoFit: {
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  logoBoom: {
    color: "#22c55e",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  headlineBox: { alignItems: "center", gap: 14 },
  headline: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
    lineHeight: 44,
    letterSpacing: -0.5,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  headlineAccent: {
    color: "#4ade80",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  heroDesc: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    lineHeight: 23,
    maxWidth: 300,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  pillText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.9)",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  authMethodRow: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    padding: 5,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  methodBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  methodBtnActive: {
    backgroundColor: "#1d4ed8",
    shadowColor: "#1d4ed8",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  methodBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.75)",
  },
  methodBtnTextActive: {
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  startBtn: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  startBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
  },
  startBtnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  freeText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  authInner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 24,
  },
  backRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  backText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.85)",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  authLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "center",
    marginBottom: 8,
  },
  authLogoIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#f97316",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },

  authCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 20,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  telegramInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  telegramDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    lineHeight: 21,
  },
  telegramBold: {
    fontFamily: "Inter_700Bold",
    color: "#38bdf8",
  },
  openBotBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0088cc",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    shadowColor: "#0088cc",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  openBotBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    flex: 1,
    textAlign: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  codeHint: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_400Regular",
    marginTop: -8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  codeInput: {
    fontSize: 24,
    textAlign: "center",
    letterSpacing: 10,
    fontFamily: "Inter_700Bold",
  },
  button: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  linkText: {
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  countdownText: {
    color: "rgba(255,255,255,0.5)",
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  switchLink: { alignItems: "center", paddingTop: 4 },
  switchLinkText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#4ade80",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
