import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getGyms, getCredits } from "@/services/api";
import { usePartialPaymentDismiss } from "@/hooks/usePartialPaymentDismiss";
import GymCard from "@/components/GymCard";
import PaymentMethodModal from "@/components/PaymentMethodModal";
import PartialPaymentModal from "@/components/PartialPaymentModal";
import PaymentSelectorModal from "@/components/PaymentSelectorModal";
import MapWebViewModal from "@/components/MapWebViewModal";
import Colors from "@/constants/Colors";

const LANG_LABELS: Record<string, string> = { uz: "UZB", ru: "RUS", en: "ENG" };

function distKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function HomeScreen() {
  const { user, refetchUser } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [selectorMode, setSelectorMode] = useState<"topup" | "partial">("topup");
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [partialModalVisible, setPartialModalVisible] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [gyms, setGyms] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLat(pos.coords.latitude);
      setUserLng(pos.coords.longitude);
    })();
  }, []);

  const { data: gymsData, refetch: refetchGyms } = useQuery({
    queryKey: ["/api/gyms"],
    queryFn: () => getGyms({}),
  });

  const { data: creditsData, refetch: refetchCredits } = useQuery({
    queryKey: ["/credits"],
    queryFn: getCredits,
    staleTime: 30 * 1000,
  });

  const activePartialPayment = creditsData?.activePartialPayment;
  const { isVisible: partialBannerVisible, dismissPayment } =
    usePartialPaymentDismiss(activePartialPayment);

  useEffect(() => {
    const raw: any[] = (gymsData?.gyms || []).filter(
      (g: any) => g.name !== "Velodrom"
    );
    const withDist = raw.map((g: any) => {
      const lat2 = parseFloat(g.latitude);
      const lng2 = parseFloat(g.longitude);
      const d =
        userLat !== null &&
        userLng !== null &&
        !isNaN(lat2) &&
        !isNaN(lng2)
          ? distKm(userLat, userLng, lat2, lng2)
          : null;
      return { ...g, distanceKm: d };
    });
    const sorted = [...withDist].sort((a: any, b: any) => {
      if (a.distanceKm === null && b.distanceKm === null) return 0;
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });
    setGyms(sorted.slice(0, 3));
  }, [gymsData, userLat, userLng]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchUser(), refetchGyms(), refetchCredits()]);
    setRefreshing(false);
  };

  const daysLeft = user?.creditExpiryDate
    ? Math.ceil(
        (new Date(user.creditExpiryDate).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const isExpired = daysLeft !== null && daysLeft <= 0;

  const nextLang = (): "uz" | "ru" | "en" => {
    if (language === "uz") return "ru";
    if (language === "ru") return "en";
    return "uz";
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: 110 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logoText}>
            <Text style={styles.logoFit}>Fit</Text>
            <Text style={styles.logoBoom}>Boom</Text>
          </Text>
          <Text style={styles.logoSubtitle}>{t("home.subtitle")}</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.langBtn}
            onPress={() => setLanguage(nextLang())}
            activeOpacity={0.7}
          >
            <Feather name="globe" size={13} color={Colors.textSecondary} />
            <Text style={styles.langLabel}>{LANG_LABELS[language]}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/(tabs)/profile" as any)}
            activeOpacity={0.7}
          >
            <View style={styles.avatarCircle}>
              <Feather name="user" size={16} color={Colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Kredit Kartasi ─── */}
      <LinearGradient
        colors={
          isExpired
            ? ["#ef4444", "#b91c1c"]
            : [Colors.primary, Colors.primaryDark]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.creditCard}
      >
        <View style={styles.creditCardTopRow}>
          <View>
            <Text style={styles.creditLabel}>{t("home.balance")}</Text>
            <View style={styles.creditNumberRow}>
              <Text style={styles.creditNumber}>{user?.credits ?? 0}</Text>
              <Text style={styles.creditUnit}>kredit</Text>
            </View>
          </View>
          {daysLeft !== null && !isExpired && (
            <View style={styles.daysPill}>
              <Text style={styles.daysPillText}>
                {daysLeft} {t("home.days_left")}
              </Text>
            </View>
          )}
          {isExpired && (
            <View style={styles.daysPill}>
              <Text style={styles.daysPillText}>{t("home.expired")}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.topupBtn}
          onPress={() => { setSelectorMode("topup"); setSelectorVisible(true); }}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={18} color={Colors.primary} />
          <Text style={styles.topupBtnText}>
            {isExpired ? t("home.renew") : t("home.topup")}
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* ─── Qoldiq To'lov Banner ─── */}
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

      {/* ─── Yaqin Zallar ─── */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{t("home.near_gyms")}</Text>
          <Text style={styles.sectionSubtitle}>{t("home.sorted_by_distance")}</Text>
        </View>
        <TouchableOpacity
          style={styles.viewAllBtn}
          onPress={() => setMapModalVisible(true)}
        >
          <Text style={styles.viewAll}>{t("home.view_all")}</Text>
          <Feather name="arrow-right" size={14} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {gyms.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="activity" size={36} color="#CBD5E1" />
          <Text style={styles.emptyText}>{t("home.loading")}</Text>
        </View>
      ) : (
        gyms.map((gym: any) => (
          <GymCard
            key={gym.id}
            gym={gym}
            onPress={() => router.push(`/gym/${gym.id}?distanceKm=${gym.distanceKm ?? ""}` as any)}
            onBook={() => router.push(`/gym/${gym.id}?distanceKm=${gym.distanceKm ?? ""}` as any)}
          />
        ))
      )}

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
      <MapWebViewModal
        visible={mapModalVisible}
        onClose={() => setMapModalVisible(false)}
      />
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, backgroundColor: "#fff" },
  content: { paddingHorizontal: 16 },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  logoText: { fontSize: 28, fontFamily: "Inter_700Bold" },
  logoFit: { color: Colors.text },
  logoBoom: { color: Colors.primary },
  logoSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    marginTop: 3,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  langBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  iconBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Credit Card */
  creditCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 28,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  creditCardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  creditLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Inter_500Medium",
    marginBottom: 4,
  },
  creditNumberRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  creditNumber: {
    fontSize: 38,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    lineHeight: 42,
  },
  creditUnit: {
    fontSize: 18,
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Inter_500Medium",
  },
  daysPill: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  daysPillText: {
    fontSize: 12,
    color: "#fff",
    fontFamily: "Inter_500Medium",
  },
  topupBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  topupBtnText: {
    color: Colors.primary,
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },

  partialBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#b91c1c",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
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

  /* Section */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewAll: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },

  /* Empty */
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
});
