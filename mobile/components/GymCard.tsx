import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  CalendarCheck,
  Clock,
  Dumbbell,
  ImageIcon,
  Info,
  MapPin,
  Star,
} from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { Badge, Button, Card, Font, Gold, Radius } from "@/components/ui";

/*
 * Zal kartasi — vebdagi client/src/components/GymCard.tsx bilan bir xil:
 * 4:3 rasm, pastdan qorayadigan gradient, rasm ustida nom/masofa/vaqt,
 * o'ng tepada kredit belgisi, pastda (i) va "Band qilish".
 */

interface Gym {
  id: string;
  name: string;
  address?: string;
  credits: number;
  imageUrl: string;
  images?: string[];
  categories?: Array<string | { id?: string; name?: string }>;
  hours?: string;
  avgRating?: number | null;
  ratingCount?: number;
  distance?: string | number;
  distanceKm?: number | null;
  latitude?: string;
  longitude?: string;
}

interface GymCardProps {
  gym: Gym;
  /** Rasm yoki (i) bosilganda — zal sahifasi */
  onPress: () => void;
  onBook?: (id: string) => void;
}

export default function GymCard({ gym, onPress, onBook }: GymCardProps) {
  const { theme } = useTheme();
  const [imgError, setImgError] = useState(false);

  const images = gym.images && gym.images.length > 0 ? gym.images : [gym.imageUrl];
  const cover = images[0];

  const distanceText =
    gym.distanceKm != null
      ? `${gym.distanceKm.toFixed(1)} km`
      : typeof gym.distance === "number"
        ? `${gym.distance.toFixed(1)} km`
        : gym.distance || "";

  const categoriesText = (gym.categories || [])
    .map((c) => (typeof c === "string" ? c : c?.name || ""))
    .filter(Boolean)
    .join(", ");

  return (
    <Card style={styles.card}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={gym.name}>
        <View style={[styles.imageBox, { backgroundColor: theme.surface }]}>
          {cover && !imgError ? (
            <Image
              source={{ uri: cover }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={250}
              onError={() => setImgError(true)}
            />
          ) : (
            <View style={styles.placeholder}>
              <Dumbbell size={40} color={theme.textSecondary} />
            </View>
          )}

          {/* from-black/80 via-black/20 to-transparent */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.2)", "rgba(0,0,0,0.8)"]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />

          {images.length > 1 && (
            <View style={styles.photoCount}>
              <ImageIcon size={14} color="#FFFFFF" />
              <Text style={styles.photoCountText}>{images.length} ta rasm</Text>
            </View>
          )}

          <Badge style={styles.creditBadge} textStyle={styles.creditBadgeText}>
            {gym.credits} kredit
          </Badge>

          <View style={styles.overlay}>
            <Text style={styles.name} numberOfLines={2}>
              {gym.name}
            </Text>
            <View style={styles.metaRow}>
              {!!distanceText && (
                <View style={styles.meta}>
                  <MapPin size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={[styles.metaText, { color: "rgba(255,255,255,0.9)" }]}>
                    {distanceText}
                  </Text>
                </View>
              )}
              {!!gym.hours && (
                <View style={styles.meta}>
                  <Clock size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={[styles.metaText, { color: "rgba(255,255,255,0.7)" }]}>
                    {gym.hours}
                  </Text>
                </View>
              )}
              {gym.avgRating != null && (
                <View style={styles.meta}>
                  <Star size={14} color="#FACC15" fill="#FACC15" />
                  <Text style={[styles.metaText, { color: "#FACC15" }]}>
                    {gym.avgRating.toFixed(1)}
                  </Text>
                  <Text style={styles.ratingCount}>({gym.ratingCount ?? 0})</Text>
                </View>
              )}
            </View>
            {!!categoriesText && (
              <Text style={styles.categories} numberOfLines={1}>
                {categoriesText}
              </Text>
            )}
          </View>
        </View>
      </Pressable>

      <View style={styles.actions}>
        <Button
          variant="ghost"
          size="icon"
          icon={Info}
          onPress={onPress}
          accessibilityLabel="Batafsil"
          style={[styles.infoBtn, { borderColor: theme.border }]}
        />
        <Button
          icon={CalendarCheck}
          onPress={() => (onBook ? onBook(gym.id) : onPress())}
          style={styles.bookBtn}
        >
          Band qilish
        </Button>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%", overflow: "hidden" },
  imageBox: { width: "100%", aspectRatio: 4 / 3, position: "relative" },
  placeholder: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  photoCount: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  photoCountText: { color: "#FFFFFF", fontSize: 12, fontFamily: Font.medium },
  // Kredit — tilla belgi, to'q matn (vebda ham shunday)
  creditBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: Gold.base,
    borderWidth: 1,
    borderColor: Gold.deep,
  },
  creditBadgeText: { fontFamily: Font.display, fontSize: 14, color: Gold.text },
  overlay: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 20 },
  name: {
    color: "#FFFFFF",
    fontSize: 20,
    lineHeight: 25,
    fontFamily: Font.bold,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowRadius: 6,
  },
  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 8 },
  meta: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 14, fontFamily: Font.regular },
  ratingCount: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontFamily: Font.regular },
  categories: { marginTop: 4, color: "rgba(255,255,255,0.7)", fontSize: 14, fontFamily: Font.regular },
  actions: { flexDirection: "row", gap: 8, padding: 12, alignItems: "stretch" },
  infoBtn: { borderRadius: Radius.xl },
  bookBtn: { flex: 1, height: 40 },
});
