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
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Dumbbell,
  Pencil,
  Phone,
  User as UserIcon,
  XCircle,
} from "lucide-react-native";
import { formatDateShort } from "@shared/format";
import { Font, Radius } from "@/components/ui";
import IconTile from "@/components/IconTile";
import DefaultAvatar from "@/components/DefaultAvatar";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { haptics } from "@/hooks/useHaptics";
import { useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import {
  updateUserProfile,
  adminLogin,
  getPaymentConfig,
  uploadAvatar,
  getBookings,
} from "@/services/api";
import { usePartialPaymentDismiss } from "@/hooks/usePartialPaymentDismiss";
import Colors from "@/constants/Colors";
import PaymentMethodModal from "@/components/PaymentMethodModal";
import PartialPaymentModal from "@/components/PartialPaymentModal";
import PaymentSelectorModal from "@/components/PaymentSelectorModal";

const LANGUAGES = [
  { code: "uz", label: "O'zbek", flag: "\u{1F1FA}\u{1F1FF}" },
  { code: "ru", label: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439", flag: "\u{1F1F7}\u{1F1FA}" },
  { code: "en", label: "English", flag: "\u{1F1EC}\u{1F1E7}" },
] as const;

export default function ProfileScreen() {
  const { user, logout, refetchUser } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { theme, isDark, toggle: toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [editModal, setEditModal] = useState(false);
  const [langModal, setLangModal] = useState(false);
  const [adminModal, setAdminModal] = useState(false);
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [selectorMode, setSelectorMode] = useState<"topup" | "partial">("topup");
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [partialModalVisible, setPartialModalVisible] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [editName, setEditName] = useState(user?.name || "");
  const [editAge, setEditAge] = useState(String(user?.age || ""));
  const [editGender, setEditGender] = useState<"Erkak" | "Ayol" | "">(
    (user?.gender as "Erkak" | "Ayol") || ""
  );
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const daysLeft = user?.creditExpiryDate
    ? Math.ceil(
        (new Date(user.creditExpiryDate).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const { data: creditsConfig, refetch: refetchCredits } = useQuery({
    queryKey: ["/credits"],
    queryFn: () => getPaymentConfig(),
    staleTime: 30 * 1000,
  });

  const packages: any[] = creditsConfig?.packages || [];
  const activePartialPayment = (creditsConfig as any)?.activePartialPayment;
  const { isVisible: partialBannerVisible, dismissPayment } =
    usePartialPaymentDismiss(activePartialPayment);

  const handleSaveProfile = async () => {
    const ageNum = parseInt(editAge, 10);
    if (!editName.trim() || !editAge || isNaN(ageNum) || !editGender) {
      Alert.alert(t("common.error"), t("profile.fill_all_fields"));
      return;
    }
    setSaving(true);
    try {
      await updateUserProfile({ name: editName.trim(), age: ageNum, gender: editGender });
      await refetchUser();
      setEditModal(false);
    } catch (err: any) {
      Alert.alert(t("common.error"), err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("profile.photo_permission_title"), t("profile.photo_permission_desc"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;
    setAvatarUploading(true);
    try {
      await uploadAvatar(result.assets[0].uri);
      await refetchUser();
    } catch (err: any) {
      Alert.alert(t("common.error"), err?.message || t("profile.photo_upload_error"));
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAdminLogin = async () => {
    try {
      const data = await adminLogin({ password: adminPassword });
      if ((data as any).success) {
        setAdminModal(false);
        Alert.alert(t("common.success"), t("profile.admin_login_success"));
      }
    } catch (err: any) {
      Alert.alert(t("common.error"), err.message || t("profile.admin_wrong_password"));
    }
  };

  const handleLogout = () => {
    const doLogout = async () => {
      await logout();
      router.replace("/auth" as any);
    };
    if (Platform.OS === "web") {
      const ok = typeof window !== "undefined" && window.confirm(t("profile.logout_confirm"));
      if (ok) void doLogout();
      return;
    }
    Alert.alert(t("profile.logout"), t("profile.logout_confirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.logout"),
        style: "destructive",
        onPress: doLogout,
      },
    ]);
  };

  const menuItems = [
    {
      icon: "credit-card" as const,
      label: t("home.topup"),
      onPress: () => setPaymentModalVisible(true),
      color: Colors.primary,
    },
    {
      icon: "video" as const,
      label: t("courses.title"),
      onPress: () => router.push("/(tabs)/courses" as any),
      color: Colors.coursePurple,
    },
    {
      icon: "globe" as const,
      label: `${t("profile.language")}: ${LANGUAGES.find((l) => l.code === language)?.label}`,
      onPress: () => setLangModal(true),
      color: Colors.text,
    },
    {
      icon: (isDark ? "sun" : "moon") as any,
      label: isDark ? t("common.theme_light") : t("common.theme_dark"),
      onPress: () => { haptics.select(); toggleTheme(); },
      color: isDark ? "#FBBF24" : "#0F172A",
    },
    ...(user?.isAdmin
      ? [
          {
            icon: "shield" as const,
            label: t("profile.admin"),
            onPress: () => setAdminModal(true),
            color: Colors.coursePurple,
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

  const { data: bookingsData } = useQuery({
    queryKey: ["bookings"],
    queryFn: getBookings,
    enabled: !!user,
  });
  const bookings: any[] = bookingsData?.bookings || [];
  const completedBookings = bookings.filter((b) => b.isCompleted || b.status === "completed" || b.status === "missed");
  const activeBookings = bookings.filter((b) => b.status === "confirmed" || b.status === "pending");
  const initials = user?.name
    ? user.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  const genderLabel = user?.gender ? (user.gender === "Erkak" ? t("profile.male") : t("profile.female")) : null;
  const expiry =
    daysLeft === null || !user?.credits
      ? null
      : daysLeft < 0
        ? { text: "Muddati o'tgan", fg: "#EF4444", bg: "#FEF2F2" }
        : daysLeft <= 7
          ? { text: `${daysLeft} kun qoldi`, fg: "#D97706", bg: "#FFFBEB" }
          : { text: `${daysLeft} kun`, fg: "#059669", bg: "#ECFDF5" };

  const openEdit = () => {
    setEditName(user?.name || "");
    setEditAge(String(user?.age || ""));
    setEditGender((user?.gender as any) || "");
    setEditModal(true);
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: theme.background }]}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
    >
      {/*
        Tuzilish vebdagi client/src/pages/ProfilePage.tsx bilan bir xil:
        qorong'i sarlavha, avatar, statistika, kredit muddati, ma'lumotlar,
        faol bronlar va bronlar tarixi. Pastdagi "Sozlamalar" vebda
        /settings sahifasida turadi.
      */}
      <LinearGradient
        colors={["#020617", "#0F172A", "#020617"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.pHero, { paddingTop: insets.top }]}
      >
        <LinearGradient
          colors={["rgba(217,167,81,0.45)", "rgba(217,167,81,0)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.7 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.pTopBar}>
          <TouchableOpacity onPress={() => router.push("/(tabs)" as any)} style={styles.pRoundBtn} accessibilityLabel="Orqaga">
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.pTopTitle}>{t("profile.title")}</Text>
          <TouchableOpacity onPress={openEdit} style={[styles.pRoundBtn, { marginLeft: "auto" }]} accessibilityLabel={t("profile.edit")}>
            <Pencil size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.pAvatarBlock}>
          <View>
            {/* Tilla halqa; rasm bo'lmasa — harflar emas, tilla siymo */}
            <LinearGradient colors={["#F3D9A4", "#D9A751", "#B98537"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pRing}>
              <View style={styles.pAvatar} accessibilityLabel={initials}>
                {avatarUploading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : user?.profileImageUrl ? (
                  <Image source={{ uri: user.profileImageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <DefaultAvatar size={92} />
                )}
              </View>
            </LinearGradient>
            <TouchableOpacity onPress={handleAvatarUpload} disabled={avatarUploading} style={styles.pCameraBtn} accessibilityLabel="Rasm yuklash">
              <Camera size={16} color={theme.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.pName}>{user?.name || t("profile.user")}</Text>
          <Text style={styles.pPhone}>{user?.phone || t("profile.no_phone")}</Text>
          {(genderLabel || user?.age) && (
            <View style={styles.pBadges}>
              {genderLabel && <Text style={styles.pBadge}>{genderLabel}</Text>}
              {!!user?.age && (
                <Text style={styles.pBadge}>
                  {user.age} {t("profile.age")}
                </Text>
              )}
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Statistika — sarlavha ustiga chiqib turadi */}
      <View style={styles.pStatsWrap}>
        <View style={[styles.pStats, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Stat icon={<IconTile icon={CreditCard} kind="credits" size={32} />} value={user?.credits ?? 0} label="Kredit" />
          <View style={[styles.pDivider, { backgroundColor: theme.border }]} />
          <Stat icon={<IconTile icon={Dumbbell} kind="bookings" size={32} />} value={bookings.length} label="Jami bron" />
          <View style={[styles.pDivider, { backgroundColor: theme.border }]} />
          <Stat icon={<IconTile icon={CheckCircle2} kind="done" size={32} />} value={completedBookings.length} label="Bajarildi" />
        </View>
      </View>

      <View style={styles.pContent}>
        {expiry && (
          <View style={[styles.pExpiry, { backgroundColor: expiry.bg }]}>
            <View style={styles.pInline}>
              <Calendar size={16} color={expiry.fg} />
              <Text style={[styles.pExpiryLabel, { color: expiry.fg }]}>Kredit muddati</Text>
            </View>
            <Text style={[styles.pExpiryValue, { color: expiry.fg }]}>{expiry.text}</Text>
          </View>
        )}

        {partialBannerVisible && activePartialPayment && (
          <View style={styles.partialBanner}>
            <View style={styles.partialBannerLeft}>
              <Feather name="alert-circle" size={20} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.partialBannerTitle}>{t("partial.title")}</Text>
                <Text style={styles.partialBannerSub}>
                  {Number(activePartialPayment.remainingAmount).toLocaleString()} {t("partial.sub")}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.partialPayBtn}
              onPress={() => { setSelectorMode("partial"); setSelectorVisible(true); }}
              activeOpacity={0.85}
            >
              <Text style={styles.partialPayBtnText}>{t("partial.pay_btn")}</Text>
            </TouchableOpacity>
          </View>
        )}

        <Section title="MA'LUMOTLAR">
          <InfoRow icon={<IconTile icon={Phone} kind="phone" />} label="Telefon" value={user?.phone || "—"} />
          <InfoRow icon={<IconTile icon={UserIcon} kind="name" />} label="Ism" value={user?.name || "—"} onPress={openEdit} />
          {genderLabel && <InfoRow icon={<IconTile icon={UserIcon} kind="gender" />} label="Jins" value={genderLabel} />}
          {!!user?.age && (
            <InfoRow icon={<IconTile icon={Calendar} kind="age" />} label="Yosh" value={`${user.age} ${t("profile.age")}`} />
          )}
        </Section>

        {activeBookings.length > 0 && (
          <Section title="FAOL BRONLAR" count={activeBookings.length}>
            {activeBookings.map((b) => (
              <View key={b.id} style={styles.pRow}>
                <IconTile icon={Dumbbell} kind="bookings" size={36} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.pRowTitle, { color: theme.text }]} numberOfLines={1}>{b.gym?.name || "Zal"}</Text>
                  <Text style={[styles.pRowSub, { color: theme.textSecondary }]}>
                    {formatDateShort(b.scheduledDate || b.date)} · {b.time}
                  </Text>
                </View>
                <View style={[styles.pChip, { backgroundColor: "#FEF9C3" }]}>
                  <Clock size={10} color="#A16207" />
                  <Text style={[styles.pChipText, { color: "#A16207" }]}>Kutilmoqda</Text>
                </View>
              </View>
            ))}
          </Section>
        )}

        <Section title={t("profile.history_title").toUpperCase()} count={completedBookings.length || undefined}>
          {completedBookings.length > 0 ? (
            [...completedBookings]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((b) => {
                const missed = b.status === "missed";
                return (
                  <View key={b.id} style={styles.pRow}>
                    <IconTile icon={missed ? XCircle : CheckCircle2} kind={missed ? "missed" : "done"} size={36} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.pRowTitle, { color: theme.text }]} numberOfLines={1}>
                        {b.gym?.name || t("profile.unknown_gym")}
                      </Text>
                      <Text style={[styles.pRowSub, { color: theme.textSecondary }]}>
                        {formatDateShort(b.scheduledDate || b.date)} · {b.time}
                      </Text>
                    </View>
                    {missed && <Text style={styles.pMissed}>{t("profile.missed")}</Text>}
                  </View>
                );
              })
          ) : (
            <View style={styles.pEmpty}>
              <View style={[styles.pEmptyIcon, { backgroundColor: theme.surface }]}>
                <Dumbbell size={28} color={theme.textSecondary} style={{ opacity: 0.4 }} />
              </View>
              <Text style={[styles.pRowSub, { color: theme.textSecondary, fontSize: 14 }]}>{t("profile.no_history")}</Text>
            </View>
          )}
        </Section>

        <Section title="SOZLAMALAR">
          {menuItems.map((item) => (
            <TouchableOpacity key={item.label} style={styles.pRow} onPress={item.onPress}>
              <LinearGradient
                colors={MENU_TILE[item.icon as string] ?? ["#94A3B8", "#475569"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pMenuTile}
              >
                <Feather name={item.icon} size={18} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.pRowTitle, { flex: 1, color: item.icon === "log-out" ? item.color : theme.text }]}>
                {item.label}
              </Text>
              {item.icon !== "log-out" && <ChevronRight size={16} color={theme.textSecondary} />}
            </TouchableOpacity>
          ))}
        </Section>
      </View>

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
            <Text style={styles.modalLabel}>{t("profile.age_label")}</Text>
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
                    {g === "Erkak" ? t("profile.male") : t("profile.female")}
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
              placeholder={t("profile.admin_password_placeholder")}
              placeholderTextColor={Colors.textSecondary}
              secureTextEntry
            />
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleAdminLogin}
            >
              <Text style={styles.saveBtnText}>{t("profile.admin_enter")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <PaymentSelectorModal
        visible={selectorVisible}
        onClose={() => setSelectorVisible(false)}
        onSelectCard={() => {
          if (selectorMode === "partial") {
            setPartialModalVisible(true);
          } else {
            setPaymentModalVisible(true);
          }
        }}
      />
      <PaymentMethodModal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
      />
      {activePartialPayment && (
        <PartialPaymentModal
          visible={partialModalVisible}
          onClose={() => setPartialModalVisible(false)}
          paymentId={activePartialPayment.id}
          remainingAmount={activePartialPayment.remainingAmount}
          credits={activePartialPayment.credits}
          onSuccess={() => {
            dismissPayment(activePartialPayment!.id);
            refetchCredits();
            refetchUser();
          }}
        />
      )}
    </ScrollView>
    </View>
  );
}

/** Sozlamalar qatorlari uchun gradient plitkalar (ICON_TILES bilan bir uslubda) */
const MENU_TILE: Record<string, [string, string]> = {
  "credit-card": ["#4ADE80", "#15803D"],
  video: ["#C084FC", "#7C3AED"],
  globe: ["#38BDF8", "#2563EB"],
  moon: ["#475569", "#0F172A"],
  sun: ["#FDE68A", "#D97706"],
  shield: ["#F3D9A4", "#B98537"],
  "log-out": ["#F87171", "#B91C1C"],
};

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.pStat}>
      {icon}
      <Text style={[styles.pStatValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.pStatLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  const { theme } = useTheme();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.pCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={styles.pCardHeader}>
        <Text style={[styles.pCardTitle, { color: theme.textSecondary }]}>{title}</Text>
        {count != null && (
          <View style={styles.pCount}>
            <Text style={styles.pCountText}>{count}</Text>
          </View>
        )}
      </View>
      {items.map((child, i) => (
        <View key={i} style={i > 0 ? { borderTopWidth: 1, borderTopColor: theme.border } : undefined}>
          {child}
        </View>
      ))}
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.pRow}>
      {icon}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.pInfoLabel, { color: theme.textSecondary }]}>{label}</Text>
        <Text style={[styles.pRowTitle, { color: theme.text }]}>{value}</Text>
      </View>
      {onPress && (
        <TouchableOpacity onPress={onPress} hitSlop={12}>
          <ChevronRight size={16} color={theme.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ─── Vebdagi ProfilePage ───
  pHero: { paddingBottom: 80, overflow: "hidden" },
  pTopBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  pRoundBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  pTopTitle: { marginLeft: 12, color: "#FFFFFF", fontSize: 18, fontFamily: Font.bold },
  pAvatarBlock: { alignItems: "center", marginTop: 16 },
  pRing: {
    padding: 3,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 20 },
    elevation: 12,
  },
  pAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: "#020617",
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pInitials: { color: "#FFFFFF", fontSize: 30, fontFamily: Font.bold },
  pCameraBtn: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  pName: { marginTop: 12, color: "#FFFFFF", fontSize: 20, fontFamily: Font.bold },
  pPhone: { marginTop: 2, color: "rgba(255,255,255,0.7)", fontSize: 14, fontFamily: Font.regular },
  pBadges: { flexDirection: "row", gap: 8, marginTop: 8 },
  pBadge: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: Font.regular,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  pStatsWrap: { marginTop: -40, paddingHorizontal: 16 },
  pStats: {
    flexDirection: "row",
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOpacity: 0.15,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 20 },
    elevation: 8,
  },
  pStat: { flex: 1, alignItems: "center", gap: 6, paddingVertical: 16, paddingHorizontal: 8 },
  pStatValue: { fontSize: 18, lineHeight: 20, fontFamily: Font.bold },
  pStatLabel: { fontSize: 11, fontFamily: Font.regular, marginTop: 2 },
  pDivider: { width: 1 },
  pContent: { paddingHorizontal: 16, marginTop: 16, gap: 16 },
  pInline: { flexDirection: "row", alignItems: "center", gap: 4 },
  pExpiry: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: Radius["2xl"],
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pExpiryLabel: { fontSize: 14, fontFamily: Font.medium, marginLeft: 4 },
  pExpiryValue: { fontSize: 14, fontFamily: Font.bold },
  pCard: {
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  pCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pCardTitle: { fontSize: 12, fontFamily: Font.semibold, letterSpacing: 1.2 },
  pCount: { backgroundColor: "#F8F5ED", borderRadius: Radius.md, paddingHorizontal: 8, paddingVertical: 2 },
  pCountText: { color: "#432F19", fontSize: 10, fontFamily: Font.semibold },
  pRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  pTile: { width: 36, height: 36, borderRadius: Radius.xl, alignItems: "center", justifyContent: "center" },
  pMenuTile: { width: 40, height: 40, borderRadius: Radius.xl, alignItems: "center", justifyContent: "center" },
  pRowTitle: { fontSize: 14, fontFamily: Font.medium },
  pRowSub: { fontSize: 12, fontFamily: Font.regular },
  pInfoLabel: { fontSize: 11, fontFamily: Font.regular },
  pChip: { flexDirection: "row", alignItems: "center", gap: 4, height: 24, paddingHorizontal: 8, borderRadius: 999 },
  pChipText: { fontSize: 10, fontFamily: Font.medium },
  pMissed: { color: "#EF4444", fontSize: 10, fontFamily: Font.medium },
  pEmpty: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 16, gap: 12 },
  pEmptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 16, gap: 16 },
  profileCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  avatarSection: { flexDirection: "row", alignItems: "center", gap: 16, flex: 1 },
  avatarWrapper: { position: "relative" },
  avatarCameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
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
  partialBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#b91c1c",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    gap: 10,
  },
  partialBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  partialBannerTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  partialBannerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
  partialPayBtn: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  partialPayBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#b91c1c",
  },
  historyCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 10,
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  historyText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    fontFamily: "Inter_400Regular",
  },
  historySubText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginHorizontal: 8,
    fontFamily: "Inter_400Regular",
  },
  historyAmount: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  emptyHistoryText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    paddingVertical: 8,
  },
  menuCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
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
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 14,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
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
    backgroundColor: Colors.surface,
  },
  genderRow: { flexDirection: "row", gap: 12 },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
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
