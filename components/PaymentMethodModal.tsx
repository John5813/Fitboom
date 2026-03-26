import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { WebView } from "react-native-webview";
import { Feather } from "@expo/vector-icons";
import { getAccessToken } from "@/services/api";

const PAY_BASE = "https://fitboom--gangster5813.replit.app/mobile-pay";

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

  const uri = token ? `${PAY_BASE}?token=${token}` : PAY_BASE;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>To'lov</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={22} color="#333" />
          </TouchableOpacity>
        </View>

        {/* WebView yoki loading */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#F97316" />
          </View>
        ) : (
          <WebView
            source={{ uri }}
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
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
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
  title: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#111",
  },
  closeBtn: {
    position: "absolute",
    right: 16,
    padding: 4,
  },
  webview: {
    flex: 1,
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
