import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { request } from "@/services/api";
import Colors from "@/constants/Colors";

export default function CoursesTab() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["/collections"],
    queryFn: () => request("/collections"),
  });

  const { data: purchasesData } = useQuery({
    queryKey: ["/user/purchases"],
    queryFn: () => request("/user/purchases"),
    enabled: !!user,
  });

  const collections = data?.collections || [];
  const purchases = purchasesData?.purchases || [];
  const purchasedIds = new Set(purchases.map((p: any) => p.collectionId));

  const buyMutation = useMutation({
    mutationFn: (collectionId: string) =>
      request("/user/purchases", { method: "POST", body: { collectionId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/user/purchases"] });
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
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={[styles.header, { paddingTop: 12 }]}>
        <Text style={styles.title}>{t("courses.title")}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {collections.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="video" size={48} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>Hozircha video kurslar mavjud emas</Text>
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
                        isPurchased ? styles.courseBtnPurchased : styles.courseBtnBuy,
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
                      {isPurchased && <Feather name="play" size={12} color="#fff" />}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
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
    paddingBottom: 16,
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
  },
  list: { padding: 16, gap: 16 },
  emptyState: {
    alignItems: "center",
    paddingVertical: 80,
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
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
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
  courseBtnPurchased: { backgroundColor: Colors.purple },
  courseBtnBuy: { backgroundColor: Colors.primary },
  courseBtnText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
