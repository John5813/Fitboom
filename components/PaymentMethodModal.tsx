import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Feather } from "@expo/vector-icons";
import { getAccessToken } from "@/services/api";

const PAY_BASE = "https://fitboom--moydinovjavlon4.replit.app/mobile-pay";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function PaymentMethodModal({ visible, onClose }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      getAccessToken().then((t) => {
        setToken(t);
        setLoading(false);
      });
    }
  }, [visible]);

  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>To'lov</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={22} color="#333" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#F97316" />
          </View>
        ) : (
          <WebView
            source={{ uri: PAY_BASE, headers }}
            style={styles.webview}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#F97316" />
              </View>
            )}
            javaScriptEnabled
            domStorageEnabled
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#ebebeb",
    position: "relative",
  },
  title: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#111" },
  closeBtn: { position: "absolute", right: 16, padding: 4 },
  webview: { flex: 1 },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
});
