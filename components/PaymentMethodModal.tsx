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
import { useLanguage } from "@/contexts/LanguageContext";

const BASE_URL = "https://fitboom.replit.app/api/mobile/v1";
const PAY_BASE = "https://fitboom.replit.app/mobile-pay";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function PaymentMethodModal({ visible, onClose }: Props) {
  const { t } = useLanguage();
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      setError(null);
      setPaymentUrl(null);
      loadPaymentUrl();
    }
  }, [visible]);

  async function loadPaymentUrl() {
    try {
      const token = await getAccessToken();
      if (!token) {
        setError(t("payment.login_required"));
        setLoading(false);
        return;
      }
      const res = await fetch(`${BASE_URL}/credits`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const data = json?.data ?? json;
      const url = data?.paymentUrl;
      if (url) {
        setPaymentUrl(url);
      } else {
        setPaymentUrl(`${PAY_BASE}?token=${encodeURIComponent(token)}`);
      }
    } catch {
      setError(t("payment.connection_error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("payment.modal_title")}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={22} color="#333" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#dc2626" />
          </View>
        ) : error ? (
          <View style={styles.loadingBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadPaymentUrl}>
              <Text style={styles.retryText}>{t("payment.retry")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            source={{ uri: paymentUrl! }}
            style={styles.webview}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#dc2626" />
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
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  errorText: {
    fontSize: 15,
    color: "#e53935",
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  retryBtn: {
    backgroundColor: "#dc2626",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
