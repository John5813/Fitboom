import React, { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { MapPin, Search } from "lucide-react-native";

import { CATEGORIES } from "@shared/categories";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { haptics } from "@/hooks/useHaptics";
import { getGyms } from "@/services/api";
import GymCard from "@/components/GymCard";
import { GymCardSkeleton } from "@/components/Skeleton";
import { AnimatedListItem } from "@/components/AnimatedListItem";
import { Button, Font, Input } from "@/components/ui";

/*
 * Zallar — vebdagi HomePage (gyms tab) + GymFilters.tsx bilan bir xil:
 * sarlavha va "Google Maps'da ko'rish", qidiruv, maksimal narx, toifalar.
 *
 * Toifalar @shared/categories dan olinadi (vebda ham shunday). Ilgari
 * serverdagi ikona nomi matn bo'lib chiqardi: "dumbbell Gym", "yoga Yoga".
 */

function distKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Server toifani ID yoki {id, name} ko'rinishida qaytarishi mumkin */
function categoryIds(gym: any): string[] {
  return (gym.categories || []).map((c: any) => (typeof c === "string" ? c : c?.id)).filter(Boolean);
}

export default function GymsScreen() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    })();
  }, []);

  const { data, refetch } = useQuery({
    queryKey: ["/api/gyms"],
    queryFn: () => getGyms({}),
  });

  const sorted = useMemo(() => {
    const withDist = (data?.gyms || []).map((g: any) => {
      const lat = parseFloat(g.latitude);
      const lng = parseFloat(g.longitude);
      const d = userPos && !isNaN(lat) && !isNaN(lng) ? distKm(userPos.lat, userPos.lng, lat, lng) : null;
      return { ...g, distanceKm: d };
    });
    return withDist.sort((a: any, b: any) => {
      if (a.distanceKm === null && b.distanceKm === null) return 0;
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });
  }, [data, userPos]);

  // Vebdagi filteredGyms bilan bir xil: toifa, nom, maksimal narx
  const priceLimit = maxPrice.trim() ? Number(maxPrice) : undefined;
  const filtered = sorted.filter((gym: any) => {
    const matchesCategory = selectedCategory === "all" || categoryIds(gym).includes(selectedCategory);
    const matchesSearch = gym.name.toLowerCase().includes(search.toLowerCase());
    const matchesPrice = priceLimit === undefined || Number.isNaN(priceLimit) || gym.credits <= priceLimit;
    return matchesCategory && matchesSearch && matchesPrice;
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const openGym = (gym: any) => {
    haptics.light();
    router.push(`/gym/${gym.id}?distanceKm=${gym.distanceKm ?? ""}` as any);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>{t("home.gyms_title")}</Text>
          <Button variant="outline" size="sm" icon={MapPin} iconSize={16} onPress={() => router.push("/(tabs)/map" as any)}>
            {t("map.view_on_google")}
          </Button>
        </View>

        {/* GymFilters */}
        <View style={styles.filters}>
          <Input
            leftIcon={Search}
            value={search}
            onChangeText={setSearch}
            placeholder={t("common.search")}
            returnKeyType="search"
            testID="input-search-gyms"
          />
          <View>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              {t("settings.max_price")} ({t("profile.credits_count")})
            </Text>
            <Input
              value={maxPrice}
              onChangeText={(v) => setMaxPrice(v.replace(/[^0-9]/g, ""))}
              placeholder={t("settings.price_filter")}
              keyboardType="number-pad"
              testID="input-max-price"
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Button
              size="sm"
              variant={selectedCategory === "all" ? "default" : "outline"}
              onPress={() => setSelectedCategory("all")}
            >
              {t("common.all")}
            </Button>
            {CATEGORIES.map((c) => (
              <Button
                key={c.id}
                size="sm"
                variant={selectedCategory === c.id ? "default" : "outline"}
                onPress={() => {
                  haptics.select();
                  setSelectedCategory(c.id);
                }}
              >
                {c.name}
              </Button>
            ))}
          </ScrollView>
        </View>

        {data === undefined ? (
          <GymCardSkeleton count={3} />
        ) : filtered.length === 0 ? (
          <Text style={[styles.empty, { color: theme.textSecondary }]}>{t("home.no_gyms_filter")}</Text>
        ) : (
          <View style={styles.list}>
            {filtered.map((gym: any, idx: number) => (
              <AnimatedListItem key={gym.id} index={Math.min(idx, 6)}>
                <GymCard gym={gym} onPress={() => openGym(gym)} onBook={() => openGym(gym)} />
              </AnimatedListItem>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  // p-4 space-y-6
  content: { padding: 16, gap: 24, paddingBottom: 110 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  // font-display font-bold text-2xl
  title: { fontSize: 24, lineHeight: 32, fontFamily: Font.display, flexShrink: 1 },
  filters: { gap: 16 },
  label: { fontSize: 12, fontFamily: Font.regular, marginBottom: 4 },
  chips: { gap: 8, paddingBottom: 8 },
  list: { gap: 16 },
  empty: { textAlign: "center", paddingVertical: 48, fontSize: 14, fontFamily: Font.regular },
});
