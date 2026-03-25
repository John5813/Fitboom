import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/api";
import Colors from "@/constants/Colors";

const LANGUAGES = [
  { code: "uz", label: "O'zbek", flag: "🇺🇿" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "en", label: "English", flag: "🇬🇧" },
] as const;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, refetchUser } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [editModal, setEditModal] = useState(false);
  const [langModal, setLangModal] = useState(false);
  const [adminModal, setAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [editName, setEditName] = useState(user?.name || "");
  const [editAge, setEditAge] = useState(String(user?.age || ""));
  const [editGender, setEditGender] = useState<"Erkak" | "Ayol" | "">(
    (user?.gender as "Erkak" | "Ayol") || ""
  );
  const [saving, setSaving] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const daysLeft = user?.creditExpiryDate
    ? Math.ceil(
        (new Date(user.creditExpiryDate).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const handleSaveProfile = async () => {
    const ageNum = parseInt(editAge, 10);
    if (!editName.trim() || !editAge || isNaN(ageNum) || !editGender) {
      Alert.alert(t("common.error"), "Barcha maydonlarni to'ldiring");
      return;
    }
    setSaving(true);
    try {
      await apiRequest("/api/user/profile", "PATCH", {
        name: editName.trim(),
        age: ageNum,
        gender: editGender,
      });
      await refetchUser();
      setEditModal(false);
    } catch (err: any) {
      Alert.alert(t("common.error"), err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAdminLogin = async () => {
    try {
      const data = await apiRequest("/api/admin/login", "POST", {
        password: adminPassword,
      });
      if (data.success) {
        setAdminModal(false);
        Alert.alert(t("common.success"), "Admin sifatida kirdingiz");
      }
    } catch (err: any) {
      Alert.alert(t("common.error"), err.message || "Parol noto'g'ri");
    }
  };

  const handleLogout = () => {
    Alert.alert("Chiqish", "Tizimdan chiqmoqchimisiz?", [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.logout"),
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/auth" as any);
        },
      },
    ]);
  };

  const menuItems = [
    {
      icon: "credit-card" as const,
      label: t("home.topup"),
      onPress: () => router.push("/payment" as any),
      color: Colors.primary,
    },
    {
      icon: "video" as const,
      label: t("courses.title"),
      onPress: () => router.push("/courses/index" as any),
      color: Colors.primary,
    },
    {
      icon: "globe" as const,
      label: `${t("profile.language")}: ${LANGUAGES.find((l) => l.code === language)?.label}`,
      onPress: () => setLangModal(true),
      color: Colors.text,
    },
    ...(user?.isAdmin
      ? [
          {
            icon: "shield" as const,
            label: t("profile.admin"),
            onPress: () => setAdminModal(true),
            color: "#8B5CF6",
          },
        ]
      : []),
    {
      icon: "log-out" as const,
      label: t("profile.logout"),
      onPress: handleLogout,
      color: Colors.error,
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding + 16, paddingBottom: 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            {user?.profileImageUrl ? (
              <Image
                source={{ uri: user.profileImageUrl }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <Text style={styles.avatarInitials}>
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || "Foydalanuvchi"}</Text>
            <Text style={styles.userPhone}>{user?.phone || ""}</Text>
            <View style={styles.genderAgeBadge}>
              <Text style={styles.genderAgeText}>
                {user?.gender === "Erkak" ? "👨" : user?.gender === "Ayol" ? "👩" : "👤"}{" "}
                {user?.gender || ""}{user?.age ? `, ${user.age} yosh` : ""}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => {
            setEditName(user?.name || "");
            setEditAge(String(user?.age || ""));
            setEditGender((user?.gender as any) || "");
            setEditModal(true);
          }}
        >
          <Feather name="edit-2" size={16} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Credits Card */}
      <View style={styles.creditCard}>
        <View style={styles.creditLeft}>
          <Text style={styles.creditLabel}>{t("home.balance")}</Text>
          <View style={styles.creditRow}>
            <Text style={styles.creditAmount}>{user?.credits ?? 0}</Text>
            <Text style={styles.creditUnit}>{t("profile.credits")}</Text>
          </View>
        </View>
        <View style={styles.creditRight}>
          {daysLeft !== null && (
            <View
              style={[
                styles.expiryBadge,
                daysLeft <= 5 && daysLeft > 0
                  ? styles.expiryWarning
                  : daysLeft <= 0
                  ? styles.expiryDanger
                  : styles.expiryOk,
              ]}
            >
              <Text style={styles.expiryText}>
                {daysLeft <= 0
                  ? "Muddat tugadi!"
                  : `${daysLeft} ${t("profile.days_left")}`}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.topupBtn}
            onPress={() => router.push("/payment" as any)}
          >
            <Feather name="plus" size={14} color="#fff" />
            <Text style={styles.topupBtnText}>{t("home.topup")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuCard}>
        {menuItems.map((item, idx) => (
          <TouchableOpacity
            key={item.label}
            style={[
              styles.menuItem,
              idx < menuItems.length - 1 && styles.menuItemBorder,
            ]}
            onPress={item.onPress}
          >
            <View
              style={[
                styles.menuIconBox,
                { backgroundColor: item.color + "18" },
              ]}
            >
              <Feather name={item.icon} size={18} color={item.color} />
            </View>
            <Text
              style={[styles.menuLabel, { color: item.color }]}
            >
              {item.label}
            </Text>
            {item.icon !== "log-out" && (
              <Feather name="chevron-right" size={16} color={Colors.textSecondary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Edit Modal */}
      <Modal
        visible={editModal}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("profile.edit")}</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Feather name="x" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>{t("profile.name")}</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder={t("profile.name_placeholder")}
              placeholderTextColor={Colors.textSecondary}
            />
            <Text style={styles.modalLabel}>{t("profile.age")}</Text>
            <TextInput
              style={styles.modalInput}
              value={editAge}
              onChangeText={setEditAge}
              keyboardType="number-pad"
              placeholder={t("profile.age_placeholder")}
              placeholderTextColor={Colors.textSecondary}
            />
            <Text style={styles.modalLabel}>{t("profile.gender")}</Text>
            <View style={styles.genderRow}>
              {(["Erkak", "Ayol"] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderBtn,
                    editGender === g && styles.genderBtnActive,
                  ]}
                  onPress={() => setEditGender(g)}
                >
                  <Text
                    style={[
                      styles.genderBtnText,
                      editGender === g && styles.genderBtnTextActive,
                    ]}
                  >
                    {g === "Erkak" ? `👨 ${t("profile.male")}` : `👩 ${t("profile.female")}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>{t("profile.save")}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Language Modal */}
      <Modal
        visible={langModal}
        transparent
        animationType="slide"
        onRequestClose={() => setLangModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("profile.language")}</Text>
              <TouchableOpacity onPress={() => setLangModal(false)}>
                <Feather name="x" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.langItem,
                  language === lang.code && styles.langItemActive,
                ]}
                onPress={() => {
                  setLanguage(lang.code);
                  setLangModal(false);
                }}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text
                  style={[
                    styles.langLabel,
                    language === lang.code && { color: Colors.primary },
                  ]}
                >
                  {lang.label}
                </Text>
                {language === lang.code && (
                  <Feather name="check" size={18} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Admin Modal */}
      <Modal
        visible={adminModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAdminModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("profile.admin")}</Text>
              <TouchableOpacity onPress={() => setAdminModal(false)}>
                <Feather name="x" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              value={adminPassword}
              onChangeText={setAdminPassword}
              placeholder="Admin paroli"
              placeholderTextColor={Colors.textSecondary}
              secureTextEntry
            />
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleAdminLogin}
            >
              <Text style={styles.saveBtnText}>Kirish</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 16, gap: 16 },
  profileCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarSection: { flexDirection: "row", alignItems: "center", gap: 16, flex: 1 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: { width: 64, height: 64, borderRadius: 32 },
  avatarInitials: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  userInfo: { flex: 1, gap: 3 },
  userName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  userPhone: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  genderAgeBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  genderAgeText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  creditCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  creditLeft: { gap: 4 },
  creditLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
  },
  creditRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  creditAmount: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    lineHeight: 42,
  },
  creditUnit: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.8)",
  },
  creditRight: { alignItems: "flex-end", gap: 10 },
  expiryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  expiryOk: { backgroundColor: "rgba(255,255,255,0.2)" },
  expiryWarning: { backgroundColor: "#F59E0B" },
  expiryDanger: { backgroundColor: "#EF4444" },
  expiryText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#fff",
  },
  topupBtn: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  topupBtnText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  menuCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 14,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  modalLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  genderRow: { flexDirection: "row", gap: 12 },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  genderBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  genderBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  genderBtnTextActive: { color: Colors.primary },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  langItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  langItemActive: {},
  langFlag: { fontSize: 24 },
  langLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
});
