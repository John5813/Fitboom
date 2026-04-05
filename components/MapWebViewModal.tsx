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

const MAP_BASE = "https://fitboom.replit.app/map";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function MapWebViewModal({ visible, onClose }: Props) {
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

  const uri = token ? `${MAP_BASE}?token=${encodeURIComponent(token)}` : MAP_BASE;

  const injectedJavaScript = token
    ? `
        (function() {
          try {
            localStorage.setItem('mobile_token', '${token}');
            localStorage.setItem('fitboom_token', '${token}');
            localStorage.setItem('access_token', '${token}');
            sessionStorage.setItem('mobile_token', '${token}');
            window.__mobileToken = '${token}';
          } catch(e) {}
        })();
        true;
      `
    : undefined;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Xarita</Text>
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
            source={{
              uri,
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            }}
            style={styles.webview}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#F97316" />
              </View>
            )}
            javaScriptEnabled
            domStorageEnabled
            geolocationEnabled
            injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
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
