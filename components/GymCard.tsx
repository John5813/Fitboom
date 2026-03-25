import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import { useLanguage } from "@/contexts/LanguageContext";

const { width } = Dimensions.get("window");

interface Gym {
  id: string;
  name: string;
  address: string;
  credits: number;
  imageUrl: string;
  images?: string[];
  categories?: string[];
  hours?: string;
  rating?: number;
  avgRating?: number;
  distance?: string | number;
  latitude?: string;
  longitude?: string;
}

interface GymCardProps {
  gym: Gym;
  onPress: () => void;
  onBook?: (id: string) => void;
}

export default function GymCard({ gym, onPress, onBook }: GymCardProps) {
  const { t } = useLanguage();
  const rating = gym.avgRating ?? gym.rating ?? 0;

  const distanceText =
    typeof gym.distance === "number"
      ? `${gym.distance.toFixed(1)} km uzoqlikda`
      : gym.distance
      ? `${gym.distance} uzoqlikda`
      : null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: gym.imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={300}
        />

        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.85)"]}
          style={styles.gradient}
        />

        <View style={styles.creditBadge}>
          <Feather name="key" size={11} color="#fff" />
          <Text style={styles.creditBadgeText}>
            {gym.credits} {t("profile.credits_count")}
          </Text>
        </View>

        {rating > 0 && (
          <View style={styles.ratingBadge}>
            <Feather name="star" size={11} color="#F59E0B" />
            <Text style={styles.ratingText}>{Number(rating).toFixed(1)}</Text>
          </View>
        )}

        <View style={styles.overlay}>
          <Text style={styles.gymName} numberOfLines={1}>
            {gym.name}
          </Text>

          {distanceText && (
            <View style={styles.distanceRow}>
              <Feather name="map-pin" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.distanceText}>{distanceText}</Text>
            </View>
          )}

          <View style={styles.categoriesRow}>
            {(gym.categories || []).slice(0, 3).map((cat) => (
              <View key={cat} style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{cat}</Text>
              </View>
            ))}
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.btnDetail}
              onPress={onPress}
              activeOpacity={0.8}
            >
              <Text style={styles.btnDetailText}>Batafsil</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnBook}
              onPress={() => (onBook ? onBook(gym.id) : onPress())}
              activeOpacity={0.8}
            >
              <Text style={styles.btnBookText}>Band qilish</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  imageContainer: {
    height: 230,
    position: "relative",
    backgroundColor: Colors.card,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  creditBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  creditBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  ratingBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    gap: 8,
  },
  gymName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  distanceText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)",
  },
  categoriesRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  categoryChip: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  categoryChipText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  btnDetail: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnDetailText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  btnBook: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  btnBookText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
