import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/api";
import Colors from "@/constants/Colors";

export default function CompleteProfileScreen() {
  const insets = useSafeAreaInsets();
  const { refetchUser } = useAuth();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"Erkak" | "Ayol" | "">("");
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!name.trim() || name.trim().length < 2) {
      Alert.alert(t("common.error"), "Ism kamida 2 ta harf bo'lishi kerak");
      return;
    }
    const ageNum = parseInt(age, 10);
    if (!age || isNaN(ageNum) || ageNum < 10 || ageNum > 120) {
      Alert.alert(t("common.error"), "Yosh 10-120 orasida bo'lishi kerak");
      return;
    }
    if (!gender) {
      Alert.alert(t("common.error"), "Jinsni tanlang");
      return;
    }
    setLoading(true);
    try {
      await apiRequest("/api/user/profile", "PATCH", {
        name: name.trim(),
        age: ageNum,
        gender,
      });
      await refetchUser();
      router.replace("/(tabs)" as any);
    } catch (err: any) {
      Alert.alert(t("common.error"), err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#0B7A8C", "#085F6E", "#063F4A"]}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>FB</Text>
          </View>
          <Text style={styles.title}>{t("profile.complete_title")}</Text>
          <Text style={styles.subtitle}>{t("profile.complete_subtitle")}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>{t("profile.name")}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t("profile.name_placeholder")}
              placeholderTextColor="#AAB8BD"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t("profile.age")}</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              placeholder={t("profile.age_placeholder")}
              placeholderTextColor="#AAB8BD"
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t("profile.gender")}</Text>
            <View style={styles.genderRow}>
              {(["Erkak", "Ayol"] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderBtn,
                    gender === g && styles.genderBtnActive,
                  ]}
                  onPress={() => setGender(g)}
                >
                  <Text
                    style={[
                      styles.genderBtnText,
                      gender === g && styles.genderBtnTextActive,
                    ]}
                  >
                    {g === "Erkak" ? `👨 ${t("profile.male")}` : `👩 ${t("profile.female")}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={save}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t("profile.save")}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
    gap: 32,
  },
  header: { alignItems: "center", gap: 12 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  logoText: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#fff" },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    gap: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  field: { gap: 8 },
  label: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#1A2E35",
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
  genderRow: { flexDirection: "row", gap: 12 },
  genderBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#DDE8EC",
    alignItems: "center",
    backgroundColor: "#F8FAFB",
  },
  genderBtnActive: {
    borderColor: "#0B7A8C",
    backgroundColor: "#E8F6F8",
  },
  genderBtnText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#6B8A94",
  },
  genderBtnTextActive: { color: "#0B7A8C" },
  button: {
    backgroundColor: "#0B7A8C",
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
});
