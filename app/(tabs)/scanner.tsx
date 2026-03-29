import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import { useLanguage } from "@/contexts/LanguageContext";
import * as ImagePicker from "expo-image-picker";

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [permitted, setPermitted] = useState<boolean | null>(null);
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      if (Platform.OS === "web") {
        setPermitted(true);
        return;
      }
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      setPermitted(status === "granted");
    })();
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanAnim]);

  const scanLineY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 180],
  });

  const handleRequestPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status === "granted") {
      setPermitted(true);
    } else {
      Alert.alert(
        "Ruxsat berilmadi",
        "Kameraga ruxsat berish uchun qurilma sozlamalariga o'ting"
      );
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.title}>{t("scanner.title")}</Text>
      <Text style={styles.subtitle}>{t("scanner.desc")}</Text>

      <View style={styles.scannerFrame}>
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />

        {permitted === false ? (
          <View style={styles.noPermBox}>
            <Feather name="camera-off" size={40} color="#ccc" />
            <Text style={styles.noPermText}>Kameraga ruxsat yo'q</Text>
            <TouchableOpacity style={styles.permBtn} onPress={handleRequestPermission}>
              <Text style={styles.permBtnText}>Ruxsat berish</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.scanInner}>
              <Feather name="grid" size={32} color={Colors.primary} style={styles.qrIcon} />
            </View>
            <Animated.View
              style={[
                styles.scanLine,
                { transform: [{ translateY: scanLineY }] },
              ]}
            />
          </>
        )}
      </View>

      <Text style={styles.hint}>
        {permitted === false
          ? "Skanerlash uchun kameraga ruxsat bering"
          : "QR kodni ramka ichiga joylashtiring"}
      </Text>

      {/* Quick navigation buttons */}
      <View style={[styles.quickNav, { paddingBottom: insets.bottom + 80 }]}>
        <Text style={styles.quickNavLabel}>Tezkor o'tish</Text>
        <View style={styles.quickNavRow}>
          <TouchableOpacity
            style={styles.quickNavBtn}
            onPress={() => router.push("/(tabs)" as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.quickNavIcon, { backgroundColor: Colors.primaryLight }]}>
              <Feather name="home" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.quickNavBtnText}>Bosh sahifa</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickNavBtn}
            onPress={() => router.push("/(tabs)/gyms" as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.quickNavIcon, { backgroundColor: "rgba(16,185,129,0.12)" }]}>
              <Feather name="activity" size={22} color="#10b981" />
            </View>
            <Text style={styles.quickNavBtnText}>Zallar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const FRAME = 240;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 40,
    textAlign: "center",
  },
  scannerFrame: {
    width: FRAME,
    height: FRAME,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: Colors.primary,
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanInner: {
    width: FRAME - 40,
    height: FRAME - 40,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  qrIcon: { opacity: 0.4 },
  scanLine: {
    position: "absolute",
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: Colors.primary,
    opacity: 0.8,
    borderRadius: 1,
  },
  noPermBox: { alignItems: "center", gap: 12 },
  noPermText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  permBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  permBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  hint: {
    marginTop: 28,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  quickNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 20,
    alignItems: "center",
    gap: 12,
  },
  quickNavLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  quickNavRow: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
  },
  quickNavBtn: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  quickNavIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  quickNavBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
});
