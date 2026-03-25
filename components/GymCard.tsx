import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
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
  distance?: string;
}

interface GymCardProps {
  gym: Gym;
  onPress: () => void;
}

export default function GymCard({ gym, onPress }: GymCardProps) {
  const { t } = useLanguage();
  const rating = gym.avgRating ?? gym.rating ?? 5;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: gym.imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={300}
        />
        <View style={styles.creditBadge}>
          <Feather name="key" size={11} color="#fff" />
          <Text style={styles.creditBadgeText}>{gym.credits}</Text>
        </View>
        {rating > 0 && (
          <View style={styles.ratingBadge}>
            <Feather name="star" size={11} color="#F59E0B" />
            <Text style={styles.ratingText}>{Number(rating).toFixed(1)}</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {gym.name}
        </Text>
        <View style={styles.row}>
          <Feather name="map-pin" size={12} color={Colors.textSecondary} />
          <Text style={styles.address} numberOfLines={1}>
            {gym.address}
          </Text>
        </View>
        <View style={styles.footer}>
          <View style={styles.categoriesRow}>
            {(gym.categories || []).slice(0, 2).map((cat) => (
              <View key={cat} style={styles.categoryTag}>
                <Text style={styles.categoryTagText}>{cat}</Text>
              </View>
            ))}
          </View>
          <View style={styles.hoursRow}>
            <Feather name="clock" size={11} color={Colors.textSecondary} />
            <Text style={styles.hours}>{gym.hours || "00:00-24:00"}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    position: "relative",
    height: 160,
    backgroundColor: Colors.border,
  },
  image: { flex: 1 },
  creditBadge: {
    position: "absolute",
    top: 12,
    right: 12,
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
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  ratingBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
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
  info: { padding: 16, gap: 8 },
  name: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  address: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoriesRow: { flexDirection: "row", gap: 6 },
  categoryTag: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  hoursRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  hours: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
});
