import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";

import { useLanguage } from "@/contexts/LanguageContext";
import { getGyms, getCategories } from "@/services/api";
import Colors from "@/constants/Colors";
import GymCard from "@/components/GymCard";

export default function GymsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    (async () => {
      if (Platform.OS === "web") return;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
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
    queryKey: ["/api/gyms", selectedCategoryId, userCoords?.lat, userCoords?.lng],
    queryFn: () =>
      getGyms({
        category: selectedCategoryId ?? undefined,
        lat: userCoords?.lat,
        lng: userCoords?.lng,
      }),
    enabled: true,
  });

  const gyms: any[] = data?.gyms || [];

  const filtered = gyms.filter((gym: any) => {
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

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
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
              onPress={() => setSelectedCategoryId(cat.id)}
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
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="activity" size={40} color={Colors.textSecondary} />
            <Text style={styles.emptyTitle}>{t("gyms.no_results")}</Text>
          </View>
        ) : (
          filtered.map((gym: any) => (
            <GymCard
              key={gym.id}
              gym={gym}
              onPress={() => router.push(`/gym/${gym.id}?distanceKm=${gym.distanceKm ?? ""}` as any)}
            />
          ))
        )}
      </ScrollView>
    </View>
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
