import React, { useState } from "react";
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

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 32;

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
  const [imgError, setImgError] = useState(false);
  const imageCount = gym.images?.length ?? 1;
  const imageUrl = gym.imageUrl;

  const isUrl = (v: string) => {
    const s = v.trim().toLowerCase();
    return s.startsWith("http://") || s.startsWith("https://");
  };

  const distanceText =
    typeof gym.distance === "number"
      ? `Sizdan ${gym.distance.toFixed(1)} km uzoqlikda`
      : gym.distance && typeof gym.distance === "string" && !isUrl(gym.distance)
      ? `Sizdan ${gym.distance} uzoqlikda`
      : gym.address && !isUrl(gym.address)
      ? gym.address
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
              <Feather name="activity" size={48} color="rgba(255,255,255,0.4)" />
            </View>
          )}

          {/* Gradient overlay — always on top */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.18)", "rgba(0,0,0,0.78)"]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Image count badge */}
          {imageCount > 0 && showImage && (
            <View style={styles.imageCountBadge}>
              <Feather name="image" size={11} color="#fff" />
              <Text style={styles.imageCountText}>{imageCount} ta rasm</Text>
            </View>
          )}

          {/* Bottom overlay: name, distance, categories */}
          <View style={styles.overlay}>
            <Text style={styles.gymName} numberOfLines={1}>
              {gym.name}
            </Text>
            {distanceText && (
              <View style={styles.locationRow}>
                <Feather name="map-pin" size={13} color="rgba(255,255,255,0.9)" />
                <Text style={styles.locationText}>{distanceText}</Text>
              </View>
            )}
            {categoriesText.length > 0 && (
              <Text style={styles.categoriesText} numberOfLines={1}>
                {categoriesText}
              </Text>
            )}
          </View>

          {/* Credit badge */}
          <View style={styles.creditBadge}>
            <Text style={styles.creditBadgeText}>{gym.credits} kredit</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.btnDetail}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <Feather name="info" size={15} color="#444" />
          <Text style={styles.btnDetailText}>Batafsil</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnBook}
          onPress={() => (onBook ? onBook(gym.id) : onPress())}
          activeOpacity={0.8}
        >
          <Feather name="calendar" size={15} color="#fff" />
          <Text style={styles.btnBookText}>Band qilish</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#fff",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  imageWrapper: {
    width: CARD_WIDTH,
    height: 240,
    position: "relative",
    overflow: "hidden",
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#2c3e5a",
    justifyContent: "center",
    alignItems: "center",
  },
  imageCountBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  imageCountText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  overlay: {
    position: "absolute",
    bottom: 44,
    left: 14,
    right: 14,
    gap: 4,
  },
  gymName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    fontFamily: "Inter_400Regular",
  },
  categoriesText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontFamily: "Inter_400Regular",
  },
  creditBadge: {
    position: "absolute",
    bottom: 10,
    left: 14,
    backgroundColor: "#16a34a",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  creditBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  actionRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  btnDetail: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRightWidth: 1,
    borderRightColor: "#f0f0f0",
  },
  btnDetailText: {
    color: "#333",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  btnBook: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    backgroundColor: Colors.primary,
  },
  btnBookText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
