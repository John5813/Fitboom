import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Clock, Dumbbell, MapPin, QrCode, X } from "lucide-react-native";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button, Card, Font, Radius } from "@/components/ui";

/*
 * Bron kartasi — vebdagi client/src/components/BookingCard.tsx bilan bir xil:
 * chapda 80px rasm, nom, "sana • vaqt", pastda Skaner / Harita / Bekor qilish.
 */

interface BookingCardProps {
  gymName: string;
  gymImage?: string | null;
  date: string;
  time: string;
  onScanQR: () => void;
  onOpenMap?: () => void;
  onCancel: () => void;
  cancelling?: boolean;
}

export default function BookingCard({
  gymName,
  gymImage,
  date,
  time,
  onScanQR,
  onOpenMap,
  onCancel,
  cancelling,
}: BookingCardProps) {
  const { t } = useLanguage();
  const { theme } = useTheme();

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        {gymImage ? (
          <Image source={{ uri: gymImage }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.placeholder, { backgroundColor: theme.surface }]}>
            <Dumbbell size={28} color={theme.textSecondary} />
          </View>
        )}
        <View style={styles.body}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {gymName}
          </Text>
          <View style={styles.meta}>
            <Clock size={12} color={theme.textSecondary} />
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
              {date} • {time}
            </Text>
          </View>
          <View style={styles.actions}>
            <Button size="sm" icon={QrCode} onPress={onScanQR}>
              {t("nav.scanner")}
            </Button>
            {onOpenMap && (
              <Button size="sm" variant="outline" icon={MapPin} onPress={onOpenMap}>
                {t("map.title_short")}
              </Button>
            )}
            <Button size="sm" variant="destructive" icon={X} onPress={onCancel} disabled={cancelling}>
              {t("common.cancel")}
            </Button>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16 },
  row: { flexDirection: "row", gap: 16 },
  image: { width: 80, height: 80, borderRadius: Radius.md },
  placeholder: { alignItems: "center", justifyContent: "center" },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontFamily: Font.semibold, marginBottom: 4 },
  meta: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { fontSize: 14, fontFamily: Font.regular },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
});
