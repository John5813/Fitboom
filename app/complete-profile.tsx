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
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { updateUserProfile } from "@/services/api";
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <LinearGradient
            colors={["#fb923c", "#f97316"]}
            style={styles.logoCircle}
          >
            <Feather name="zap" size={32} color="#fff" />
          </LinearGradient>
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
              placeholderTextColor={Colors.textSecondary}
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
              placeholderTextColor={Colors.textSecondary}
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
                    {g === "Erkak" ? t("profile.male") : t("profile.female")}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    gap: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  field: { gap: 8 },
  label: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
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
  genderRow: { flexDirection: "row", gap: 12 },
  genderBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    backgroundColor: Colors.surface,
  },
  genderBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  genderBtnText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  genderBtnTextActive: { color: Colors.primary },
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
});
