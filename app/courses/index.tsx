import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/api";
import Colors from "@/constants/Colors";

export default function CoursesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const { data } = useQuery({
    queryKey: ["/api/video-collections"],
    queryFn: () => apiRequest("/api/video-collections"),
  });

  const { data: purchasesData } = useQuery({
    queryKey: ["/api/user/purchases"],
    queryFn: () => apiRequest("/api/user/purchases"),
    enabled: !!user,
  });

  const collections = data?.collections || [];
  const purchases = purchasesData?.purchases || [];
  const purchasedIds = new Set(purchases.map((p: any) => p.collectionId));

  const buyMutation = useMutation({
    mutationFn: (collectionId: string) =>
      apiRequest("/api/user/purchases", "POST", { collectionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/purchases"] });
      Alert.alert(t("common.success"), "Kurs muvaffaqiyatli sotib olindi!");
    },
    onError: (err: any) => {
      Alert.alert(t("common.error"), err.message);
    },
  });

  const handleBuy = (collection: any) => {
    if (collection.isFree) {
      router.push(`/courses/${collection.id}` as any);
      return;
    }
    Alert.alert(
      collection.name,
      `${collection.price} so'm evaziga sotib olasizmi?`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("courses.buy"),
          onPress: () => buyMutation.mutate(collection.id),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("courses.title")}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {collections.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="video" size={40} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>
              Hozircha video kurslar mavjud emas
            </Text>
          </View>
        ) : (
          collections.map((col: any) => {
            const isPurchased = purchasedIds.has(col.id) || col.isFree;
            return (
              <View key={col.id} style={styles.courseCard}>
                <Image
                  source={{ uri: col.thumbnailUrl }}
                  style={styles.thumbnail}
                  contentFit="cover"
                  transition={300}
                />
                <View style={styles.courseInfo}>
                  <Text style={styles.courseName}>{col.name}</Text>
                  <Text style={styles.courseDesc} numberOfLines={2}>
                    {col.description}
                  </Text>
                  <View style={styles.courseFooter}>
                    <View style={styles.videoCount}>
                      <Feather name="play-circle" size={13} color={Colors.textSecondary} />
                      <Text style={styles.videoCountText}>
                        {col.videoCount || 0} {t("courses.videos")}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.courseBtn,
                        isPurchased
                          ? styles.courseBtnPurchased
                          : styles.courseBtnBuy,
                      ]}
                      onPress={() => {
                        if (isPurchased) {
                          router.push(`/courses/${col.id}` as any);
                        } else {
                          handleBuy(col);
                        }
                      }}
                    >
                      <Text style={styles.courseBtnText}>
                        {isPurchased
                          ? t("courses.watch")
                          : col.isFree
                          ? t("courses.free")
                          : `${(col.price / 1000).toFixed(0)}K so'm`}
                      </Text>
                      {isPurchased && (
                        <Feather name="play" size={12} color="#fff" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
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
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  list: { padding: 16, gap: 16 },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  courseCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  thumbnail: { width: "100%", height: 180, backgroundColor: Colors.border },
  courseInfo: { padding: 16, gap: 8 },
  courseName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  courseDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  courseFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  videoCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  videoCountText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  courseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  courseBtnPurchased: { backgroundColor: Colors.primary },
  courseBtnBuy: { backgroundColor: Colors.text },
  courseBtnText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
