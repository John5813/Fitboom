import React, { useState, useCallback, useRef } from "react";
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
import { router, useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import { useAuth } from "@/contexts/AuthContext";
import { verifyQr } from "@/services/api";

export default function ScannerScreen() {
  "use no memo";
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { refetchUser } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    gymName?: string;
  } | null>(null);
  const processingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      setResult(null);
      setLoading(false);
      setCameraError(null);
      processingRef.current = false;
    }, [])
  );

  const handleBarCodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (processingRef.current) return;
      processingRef.current = true;
      setScanned(true);
      setLoading(true);

      try {
        const res = await verifyQr(data);
        setResult({
          success: true,
          message: res.message || "Xush kelibsiz!",
          gymName: res.gym?.name,
        });
        queryClient.invalidateQueries({ queryKey: ["bookings"] });
        refetchUser();
      } catch (err: any) {
        setResult({
          success: false,
          message: err.message || "Xatolik yuz berdi",
        });
        processingRef.current = false;
      } finally {
        setLoading(false);
      }
    },
    [queryClient, refetchUser]
  );

  const resetScanner = () => {
    setScanned(false);
    setResult(null);
    setLoading(false);
    processingRef.current = false;
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
          <Text style={styles.permTitle}>Kameraga ruxsat kerak</Text>
          <Text style={styles.permDesc}>
            {canAsk
              ? "QR kodni skanerlash uchun kameraga ruxsat bering"
              : "Kamera ruxsati rad etilgan. Qurilma sozlamalaridan kameraga ruxsat bering."}
          </Text>
          <TouchableOpacity
            style={styles.permBtn}
            onPress={canAsk ? requestPermission : () => Linking.openSettings()}
          >
            <Text style={styles.permBtnText}>
              {canAsk ? "Ruxsat berish" : "Sozlamalarga o'tish"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (result) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
        <View style={styles.resultBox}>
          <View
            style={[
              styles.resultIcon,
              {
                backgroundColor: result.success
                  ? "rgba(16,185,129,0.12)"
                  : "rgba(239,68,68,0.1)",
              },
            ]}
          >
            <Feather
              name={result.success ? "check-circle" : "x-circle"}
              size={48}
              color={result.success ? "#10b981" : Colors.error}
            />
          </View>
          {result.gymName && result.success && (
            <Text style={styles.resultGymName}>{result.gymName}</Text>
          )}
          <Text
            style={[
              styles.resultMessage,
              { color: result.success ? "#10b981" : Colors.error },
            ]}
          >
            {result.message}
          </Text>
          <TouchableOpacity style={styles.resetBtn} onPress={resetScanner}>
            <Feather name="refresh-cw" size={16} color="#fff" />
            <Text style={styles.resetBtnText}>Qayta skanerlash</Text>
          </TouchableOpacity>
          {result.success && (
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => router.push("/(tabs)/bookings" as any)}
            >
              <Feather name="arrow-left" size={16} color={Colors.primary} />
              <Text style={styles.navBtnText}>Bronlarga qaytish</Text>
            </TouchableOpacity>
          )}
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
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          onCameraReady={() => setCameraError(null)}
          onMountError={(e) => setCameraError(e.message || "Kamera ochilmadi")}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#111" }]} />
      )}

      {cameraError && (
        <View style={styles.errorOverlay}>
          <Feather name="alert-circle" size={40} color="#fff" />
          <Text style={styles.errorText}>{cameraError}</Text>
          <TouchableOpacity
            style={styles.permBtn}
            onPress={() => setCameraError(null)}
          >
            <Text style={styles.permBtnText}>Qayta urinish</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.overlay, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.overlayTitle}>QR Skaner</Text>
        <Text style={styles.overlaySubtitle}>
          Zal eshigidagi QR kodni ramka ichiga joylashtiring
        </Text>
      </View>

      <View style={styles.frameContainer}>
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.cTL]} />
          <View style={[styles.corner, styles.cTR]} />
          <View style={[styles.corner, styles.cBL]} />
          <View style={[styles.corner, styles.cBR]} />
        </View>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Tekshirilmoqda...</Text>
        </View>
      )}

      <View style={[styles.bottomHint, { paddingBottom: insets.bottom + 80 }]}>
        <Text style={styles.hintText}>
          Har bir zal eshigida QR kod bor. Shu QR ni skanerlang.
        </Text>
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
  resultGymName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
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
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    zIndex: 30,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#fff",
    textAlign: "center",
  },
});
