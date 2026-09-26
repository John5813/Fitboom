import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Globe, MapPin, Settings, User } from "lucide-react-native";
import * as Location from "expo-location";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { haptics } from "@/hooks/useHaptics";
import { getGyms, getCredits } from "@/services/api";
import { usePartialPaymentDismiss } from "@/hooks/usePartialPaymentDismiss";
import GymCard from "@/components/GymCard";
import PaymentMethodModal from "@/components/PaymentMethodModal";
import PartialPaymentModal from "@/components/PartialPaymentModal";
import PaymentSelectorModal from "@/components/PaymentSelectorModal";
import MapWebViewModal from "@/components/MapWebViewModal";
import { GymCardSkeleton } from "@/components/Skeleton";
import { AnimatedListItem } from "@/components/AnimatedListItem";
import CreditBalance from "@/components/CreditBalance";
import { Button, Card, Font, Gold, Radius } from "@/components/ui";

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
  const { theme } = useTheme();
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
    // Vebda bosh sahifada 8 tagacha zal ko'rsatiladi
    setGyms(sorted.slice(0, 8));
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/*
          Tuzilish vebdagi HomePage (home tab) bilan bir xil: sarlavha,
          CreditBalance, "Sizga eng yaqin zallar" va GymCard ro'yxati.
        */}
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <Text style={styles.logo}>
              <Text style={{ color: theme.text }}>Fit</Text>
              <Text style={{ color: Gold.base }}>Boom</Text>
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t("home.subtitle")}</Text>
          </View>
          <View style={styles.headerActions}>
            <Button
              variant="ghost"
              size="sm"
              icon={Globe}
              iconSize={16}
              onPress={() => setLanguage(nextLang())}
              style={styles.langBtn}
              textStyle={styles.langText}
              accessibilityLabel="Til"
            >
              {LANG_LABELS[language]}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              icon={User}
              iconSize={20}
              onPress={() => router.push("/(tabs)/profile" as any)}
              accessibilityLabel="Profil"
            />
            <Button
              variant="ghost"
              size="icon"
              icon={Settings}
              iconSize={20}
              onPress={() => router.push("/(tabs)/profile" as any)}
              accessibilityLabel="Sozlamalar"
            />
          </View>
        </View>

        <CreditBalance
          credits={user?.credits ?? 0}
          creditExpiryDate={user?.creditExpiryDate}
          onPurchase={() => {
            setSelectorMode("topup");
            setSelectorVisible(true);
          }}
        />

        {partialBannerVisible && activePartialPayment && (
          <View style={styles.partialBanner}>
            <View style={styles.partialBannerLeft}>
              <AlertCircle size={20} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.partialBannerTitle}>{t("partial.title")}</Text>
                <Text style={styles.partialBannerSub}>
                  {Number(activePartialPayment.remainingAmount).toLocaleString()} {t("partial.sub")}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.partialPayBtn}
              onPress={() => {
                setSelectorMode("partial");
                setSelectorVisible(true);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.partialPayBtnText}>{t("partial.pay_btn")}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("home.near_gyms")}</Text>
            <Pressable
              onPress={() => {
                haptics.light();
                setMapModalVisible(true);
              }}
              style={styles.viewAll}
              accessibilityRole="link"
            >
              <Text style={[styles.viewAllText, { color: theme.primary }]}>{t("home.view_all")} ›</Text>
            </Pressable>
          </View>
          <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>
            {userLat !== null ? t("home.sorted_by_distance") : t("home.nearby_gyms_desc")}
          </Text>

          {gymsData === undefined ? (
            <GymCardSkeleton count={3} />
          ) : gyms.length > 0 ? (
            <View style={styles.list}>
              {gyms.map((gym: any, idx: number) => (
                <AnimatedListItem key={gym.id} index={Math.min(idx, 6)}>
                  <GymCard
                    gym={gym}
                    onPress={() => {
                      haptics.light();
                      router.push(`/gym/${gym.id}?distanceKm=${gym.distanceKm ?? ""}` as any);
                    }}
                    onBook={() => {
                      haptics.medium();
                      router.push(`/gym/${gym.id}?distanceKm=${gym.distanceKm ?? ""}` as any);
                    }}
                  />
                </AnimatedListItem>
              ))}
            </View>
          ) : (
            <Card style={styles.empty}>
              <View style={styles.emptyIcon}>
                <MapPin size={40} color="#EF4444" />
              </View>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t("home.no_gyms_yet")}</Text>
            </Card>
          )}
        </View>

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
        <PaymentMethodModal visible={paymentModalVisible} onClose={() => setPaymentModalVisible(false)} />
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
        <MapWebViewModal visible={mapModalVisible} onClose={() => setMapModalVisible(false)} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  // Vebda: p-4 space-y-5, pastki menyu uchun pb-20
  content: { padding: 16, gap: 20, paddingBottom: 110 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingTop: 4,
  },
  headerTitle: { flexShrink: 1 },
  // font-display font-extrabold text-3xl leading-tight
  logo: { fontSize: 30, lineHeight: 37, fontFamily: Font.displayExtra },
  subtitle: { fontSize: 14, fontFamily: Font.regular, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  langBtn: { minHeight: 32, height: 32, paddingHorizontal: 8, gap: 8 },
  langText: { fontSize: 12, fontFamily: Font.medium },

  partialBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#b91c1c",
    borderRadius: Radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  partialBannerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  partialBannerTitle: { fontSize: 14, fontFamily: Font.bold, color: "#fff" },
  partialBannerSub: {
    fontSize: 12,
    fontFamily: Font.regular,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
  partialPayBtn: {
    backgroundColor: "#fff",
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  partialPayBtnText: { fontSize: 13, fontFamily: Font.bold, color: "#b91c1c" },

  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  // font-display font-bold text-xl
  sectionTitle: { fontSize: 20, lineHeight: 28, fontFamily: Font.display, flexShrink: 1 },
  viewAll: { paddingHorizontal: 8, paddingVertical: 8, marginRight: -8 },
  viewAllText: { fontSize: 14, fontFamily: Font.medium },
  sectionSub: { fontSize: 14, fontFamily: Font.regular, marginBottom: 16 },
  list: { gap: 20 },

  empty: { padding: 32, alignItems: "center", gap: 16 },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { fontSize: 14, fontFamily: Font.regular, textAlign: "center" },
});
