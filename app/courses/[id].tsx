import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";

import { useLanguage } from "@/contexts/LanguageContext";
import { request, fixImageUrl } from "@/services/api";
import Colors from "@/constants/Colors";

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading } = useQuery({
    queryKey: [`/collections/${id}`],
    queryFn: () => request(`/collections/${id}`),
    enabled: !!id,
  });

  const collection = data?.collection || data;
  const videos = collection?.videos || data?.videos || [];

  const playVideo = (url: string) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {
      console.log("Cannot open URL:", url);
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {collection?.name || t("courses.title")}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {collection?.thumbnailUrl && (
          <Image
            source={{ uri: fixImageUrl(collection.thumbnailUrl) }}
            style={styles.thumbnail}
            contentFit="cover"
            transition={300}
          />
        )}

        {collection?.description && (
          <View style={styles.descCard}>
            <Text style={styles.descText}>{collection.description}</Text>
          </View>
        )}

        <Text style={styles.videosTitle}>
          {videos.length} {t("courses.videos")}
        </Text>

        {videos.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="video-off" size={32} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>Videolar hali qo'shilmagan</Text>
          </View>
        ) : (
          videos.map((video: any, idx: number) => (
            <TouchableOpacity
              key={video.id || idx}
              style={styles.videoCard}
              onPress={() => playVideo(video.videoUrl || video.url)}
            >
              <View style={styles.videoThumbnail}>
                {video.thumbnailUrl ? (
                  <Image
                    source={{ uri: fixImageUrl(video.thumbnailUrl) }}
                    style={styles.videoThumb}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.videoThumbPlaceholder}>
                    <Feather name="play-circle" size={32} color={Colors.primary} />
                  </View>
                )}
                <View style={styles.playOverlay}>
                  <Feather name="play" size={20} color="#fff" />
                </View>
              </View>
              <View style={styles.videoInfo}>
                <Text style={styles.videoTitle} numberOfLines={2}>
                  {video.title || `Video ${idx + 1}`}
                </Text>
                {video.duration && (
                  <View style={styles.durationRow}>
                    <Feather name="clock" size={11} color={Colors.textSecondary} />
                    <Text style={styles.durationText}>{video.duration}</Text>
                  </View>
                )}
                {video.description && (
                  <Text style={styles.videoDesc} numberOfLines={1}>
                    {video.description}
                  </Text>
                )}
              </View>
              <View style={styles.indexBadge}>
                <Text style={styles.indexText}>{idx + 1}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
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
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    flex: 1,
  },
  content: { padding: 16, gap: 16 },
  thumbnail: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    backgroundColor: Colors.border,
  },
  descCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  descText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  videosTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  videoCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  videoThumbnail: {
    width: 90,
    height: 80,
    position: "relative",
  },
  videoThumb: { width: 90, height: 80, backgroundColor: Colors.border },
  videoThumbPlaceholder: {
    width: 90,
    height: 80,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  playOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  videoInfo: { flex: 1, padding: 12, gap: 4 },
  videoTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    lineHeight: 20,
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  durationText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  videoDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  indexText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
});
