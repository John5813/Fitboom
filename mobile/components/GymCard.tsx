import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/Colors";

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
  distanceKm?: number | null;
  latitude?: string;
  longitude?: string;
}

interface GymCardProps {
  gym: Gym;
  onPress: () => void;
  onBook?: (id: string) => void;
}

export default function GymCard({ gym, onPress, onBook }: GymCardProps) {
  const [imgError, setImgError] = useState(false);
  const imageUrl = gym.imageUrl;

  const distanceText =
    gym.distanceKm != null
      ? gym.distanceKm < 1
        ? `${Math.round(gym.distanceKm * 1000)} m`
        : `${gym.distanceKm.toFixed(1)} km`
      : null;

  const categoriesText = Array.isArray(gym.categories)
    ? gym.categories
        .map((c: any) => (typeof c === "string" ? c : c?.name || ""))
        .filter(Boolean)
        .join(", ")
    : "";

  const showImage = !!imageUrl && !imgError;

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.95}>
        <View style={styles.imageWrapper}>
          {showImage ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={300}
              onError={() => setImgError(true)}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Feather name="activity" size={40} color="#CBD5E1" />
            </View>
          )}

          {/* Credit badge — top right */}
          <View style={styles.creditBadge}>
            <Text style={styles.creditBadgeText}>{gym.credits} kredit</Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.gymName} numberOfLines={1}>
            {gym.name}
          </Text>
          {distanceText && (
            <View style={styles.distancePill}>
              <Feather name="map-pin" size={11} color={Colors.textSecondary} />
              <Text style={styles.distanceText}>{distanceText}</Text>
            </View>
          )}
        </View>

        {categoriesText.length > 0 && (
          <Text style={styles.categoriesText} numberOfLines={1}>
            {categoriesText}
          </Text>
        )}

        <View style={styles.actionRow}>
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
            activeOpacity={0.85}
          >
            <Text style={styles.btnBookText}>Band qilish</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  imageWrapper: {
    width: "100%",
    height: 160,
    position: "relative",
    backgroundColor: Colors.surface,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  creditBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  creditBadgeText: {
    color: Colors.text,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  body: {
    padding: 16,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  gymName: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  distancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  distanceText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  categoriesText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  btnDetail: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnDetailText: {
    color: Colors.text,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  btnBook: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  btnBookText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
