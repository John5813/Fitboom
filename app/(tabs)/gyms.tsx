import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";

import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { haptics } from "@/hooks/useHaptics";
import { getGyms, getCategories } from "@/services/api";
import Colors from "@/constants/Colors";
import GymCard from "@/components/GymCard";
import { GymCardSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { AnimatedListItem } from "@/components/AnimatedListItem";

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

export default function GymsScreen() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [sortedGyms, setSortedGyms] = useState<any[]>([]);

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

  const { data: catData } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: () => getCategories(),
    staleTime: 10 * 60 * 1000,
  });

  const categories: { id: string; name: string; icon?: string }[] =
    catData?.categories || [];

  const { data, refetch } = useQuery({
    queryKey: ["/api/gyms", selectedCategoryId],
    queryFn: () => getGyms({ category: selectedCategoryId ?? undefined }),
  });

  useEffect(() => {
    const raw: any[] = data?.gyms || [];
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
    setSortedGyms(sorted);
  }, [data, userLat, userLng]);

  const filtered = sortedGyms.filter((gym: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      gym.name.toLowerCase().includes(q) ||
      (gym.address || "").toLowerCase().includes(q)
    );
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <View style={[styles.header, { paddingTop: 12, backgroundColor: theme.card, borderBottomColor: theme.cardBorder }]}>
        <Text style={styles.title}>{t("gyms.title")}</Text>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Feather name="search" size={16} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder={t("gyms.search")}
              placeholderTextColor={Colors.textSecondary}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Feather name="x" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContent}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategoryId === null && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategoryId(null)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategoryId === null && styles.categoryChipTextActive,
              ]}
            >
              {t("gyms.all")}
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategoryId === cat.id && styles.categoryChipActive,
              ]}
              onPress={() => { haptics.select(); setSelectedCategoryId(cat.id); }}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategoryId === cat.id && styles.categoryChipTextActive,
                ]}
              >
                {cat.icon ? `${cat.icon} ` : ""}{cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {data === undefined ? (
          <GymCardSkeleton count={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="search"
            title={t("gyms.no_results")}
            description={search ? `"${search}" bo'yicha hech narsa topilmadi.` : undefined}
            actionLabel={search ? "Qidiruvni tozalash" : undefined}
            onAction={search ? () => setSearch("") : undefined}
          />
        ) : (
          filtered.map((gym: any, idx: number) => (
            <AnimatedListItem key={gym.id} index={Math.min(idx, 6)}>
              <GymCard
                gym={gym}
                onPress={() => { haptics.light(); router.push(`/gym/${gym.id}?distanceKm=${gym.distanceKm ?? ""}` as any); }}
              />
            </AnimatedListItem>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.card,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 12,
  },
  searchRow: { marginBottom: 12 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  categoriesScroll: { marginHorizontal: -16 },
  categoriesContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  categoryChipTextActive: { color: "#fff" },
  list: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
});
