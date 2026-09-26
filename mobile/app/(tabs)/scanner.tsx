import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { verifyQr } from "@/services/api";

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { refetchUser } = useAuth();
  const { t } = useLanguage();
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    gymName?: string;
  } | null>(null);

  const handleBarCodeScanned = async ({ data: rawQrString }: { data: string }) => {
    if (processing) return;
    setProcessing(true);

    let parsed: any;
    try {
      parsed = JSON.parse(rawQrString);
    } catch {
      setResult({ success: false, message: t("scanner.not_fitboom_qr") });
      setProcessing(false);
      return;
    }

    if (parsed.type !== "gym" || !parsed.gymId) {
      setResult({ success: false, message: t("scanner.not_gym_qr") });
      setProcessing(false);
      return;
    }

    try {
      const res = await verifyQr(rawQrString);
      setResult({
        success: true,
        message: res.message || `${parsed.name || t("bookings.gym_default")}${t("scanner.welcome_default")}`,
        gymName: res.gym?.name || parsed.name,
      });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      refetchUser();
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || t("scanner.error_generic"),
      });
    } finally {
      setProcessing(false);
    }
  };

  if (!permission) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    const canAsk = permission.canAskAgain !== false;
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
        <View style={styles.permissionBox}>
          <Feather name="camera-off" size={48} color={Colors.textSecondary} />
          <Text style={styles.permTitle}>{t("scanner.permission_title")}</Text>
          <Text style={styles.permDesc}>
            {canAsk
              ? t("scanner.permission_desc")
              : t("scanner.permission_denied")}
          </Text>
          <TouchableOpacity
            style={styles.permBtn}
            onPress={canAsk ? requestPermission : () => Linking.openSettings()}
          >
            <Text style={styles.permBtnText}>
              {canAsk ? t("scanner.grant") : t("scanner.open_settings")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (result) {
    if (result.success) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
      const dateStr = now.toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" });
      return (
        <View style={[styles.ticketContainer, { paddingTop: insets.top }]}>
          <View style={styles.ticketCard}>
            <View style={styles.ticketHeader}>
              <Feather name="check-circle" size={56} color="#fff" />
              <Text style={styles.ticketHeaderText}>{t("scanner.ticket_title")}</Text>
            </View>
            <View style={styles.ticketBody}>
              <Text style={styles.ticketGymName}>
                {result.gymName || t("bookings.gym_default")}
              </Text>
              <Text style={styles.ticketWelcome}>{result.message}</Text>
              <View style={styles.ticketDivider} />
              <View style={styles.ticketTimeRow}>
                <View style={styles.ticketTimeBlock}>
                  <Feather name="clock" size={16} color={Colors.textSecondary} />
                  <Text style={styles.ticketTimeLabel}>{t("scanner.time_label")}</Text>
                  <Text style={styles.ticketTimeValue}>{timeStr}</Text>
                </View>
                <View style={styles.ticketTimeSep} />
                <View style={styles.ticketTimeBlock}>
                  <Feather name="calendar" size={16} color={Colors.textSecondary} />
                  <Text style={styles.ticketTimeLabel}>{t("scanner.date_label")}</Text>
                  <Text style={styles.ticketTimeValue}>{dateStr}</Text>
                </View>
              </View>
              <View style={styles.ticketDivider} />
              <View style={styles.ticketStaffHint}>
                <Feather name="user" size={15} color={Colors.primary} />
                <Text style={styles.ticketStaffText}>{t("scanner.show_admin")}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.resetBtn} onPress={() => setResult(null)}>
            <Feather name="refresh-cw" size={16} color="#fff" />
            <Text style={styles.resetBtnText}>{t("scanner.rescan")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => router.push("/(tabs)/bookings" as any)}
          >
            <Feather name="arrow-left" size={16} color={Colors.primary} />
            <Text style={styles.navBtnText}>{t("scanner.back_bookings")}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
        <View style={styles.resultBox}>
          <View style={[styles.resultIcon, { backgroundColor: "rgba(239,68,68,0.1)" }]}>
            <Feather name="x-circle" size={48} color={Colors.error} />
          </View>
          <Text style={[styles.resultMessage, { color: Colors.error }]}>
            {result.message}
          </Text>
          <TouchableOpacity style={styles.resetBtn} onPress={() => setResult(null)}>
            <Feather name="refresh-cw" size={16} color="#fff" />
            <Text style={styles.resetBtnText}>{t("scanner.rescan")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      {Platform.OS !== "web" ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={processing ? undefined : handleBarCodeScanned}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#111" }]} />
      )}

      <View style={[styles.overlay, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.overlayTitle}>{t("scanner.title")}</Text>
        <Text style={styles.overlaySubtitle}>{t("scanner.frame_hint")}</Text>
      </View>

      <View style={styles.frameContainer}>
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.cTL]} />
          <View style={[styles.corner, styles.cTR]} />
          <View style={[styles.corner, styles.cBL]} />
          <View style={[styles.corner, styles.cBR]} />
        </View>
      </View>

      {processing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>{t("scanner.checking")}</Text>
        </View>
      )}

      <View style={[styles.bottomHint, { paddingBottom: insets.bottom + 80 }]}>
        <Text style={styles.hintText}>{t("scanner.hint")}</Text>
      </View>
    </View>
  );
}

const FRAME_SIZE = 260;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  permissionBox: {
    alignItems: "center",
    gap: 16,
  },
  permTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  permDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  permBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginTop: 8,
  },
  permBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
    paddingHorizontal: 24,
  },
  overlayTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 6,
  },
  overlaySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },
  frameContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "#fff",
    borderWidth: 3,
  },
  cTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    zIndex: 20,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  bottomHint: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  hintText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
  resultBox: {
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 24,
  },
  resultIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  resultMessage: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 16,
  },
  resetBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  navBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  ticketContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 12,
  },
  ticketCard: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  ticketHeader: {
    backgroundColor: "#10b981",
    alignItems: "center",
    paddingVertical: 28,
    gap: 10,
  },
  ticketHeaderText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 1,
  },
  ticketBody: {
    backgroundColor: Colors.card,
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 14,
  },
  ticketGymName: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
  },
  ticketWelcome: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  ticketDivider: {
    height: 1,
    backgroundColor: Colors.cardBorder,
  },
  ticketTimeRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  ticketTimeBlock: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  ticketTimeSep: {
    width: 1,
    height: 40,
    backgroundColor: Colors.cardBorder,
  },
  ticketTimeLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  ticketTimeValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  ticketStaffHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  ticketStaffText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
});
