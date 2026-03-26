import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function PaymentMethodModal({ visible, onClose }: Props) {
  const handleKarta = () => {
    onClose();
    router.push("/payment" as any);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={styles.sheet}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>To'lov usulini tanlang</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={20} color="#555" />
          </TouchableOpacity>
        </View>

        {/* Kartaga o'tkazish */}
        <TouchableOpacity style={styles.methodRow} onPress={handleKarta} activeOpacity={0.7}>
          <View style={styles.kartaIcon}>
            <Text style={styles.kartaLetter}>K</Text>
          </View>
          <Text style={styles.methodLabel}>Kartaga o'tkazish</Text>
        </TouchableOpacity>

        {/* Soon section */}
        <View style={styles.soonDivider}>
          <View style={styles.soonLine} />
          <Text style={styles.soonText}>TEZ KUNDA QO'SHILADI</Text>
          <View style={styles.soonLine} />
        </View>

        {/* Click */}
        <View style={styles.methodRowDisabled}>
          <View style={[styles.appIcon, { backgroundColor: "#5ABFB0" }]}>
            <Text style={styles.appIconText}>⊙</Text>
            <Text style={styles.appIconSub}>click</Text>
          </View>
          <Text style={styles.methodLabelDisabled}>Click</Text>
          <View style={styles.soonBadge}>
            <Text style={styles.soonBadgeText}>Yaqinda</Text>
          </View>
        </View>

        {/* Payme */}
        <View style={styles.methodRowDisabled}>
          <View style={[styles.appIcon, { backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee" }]}>
            <Text style={[styles.appIconText, { color: "#333" }]}>Pay</Text>
            <Text style={[styles.appIconSub, { color: "#e85d4a" }]}>me</Text>
          </View>
          <Text style={styles.methodLabelDisabled}>Payme</Text>
          <View style={styles.soonBadge}>
            <Text style={styles.soonBadgeText}>Yaqinda</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    left: 24,
    right: 24,
    top: "50%",
    marginTop: -170,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    position: "relative",
  },
  title: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#111",
    textAlign: "center",
  },
  closeBtn: {
    position: "absolute",
    right: 0,
    top: -2,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Karta row */
  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    paddingLeft: 14,
    marginBottom: 16,
  },
  kartaIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#5B4FE9",
    alignItems: "center",
    justifyContent: "center",
  },
  kartaLetter: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  methodLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#111",
  },

  /* Soon divider */
  soonDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  soonLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#eee",
  },
  soonText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#aaa",
    letterSpacing: 0.5,
  },

  /* Disabled rows */
  methodRowDisabled: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  appIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  appIconText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    lineHeight: 15,
  },
  appIconSub: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "#fff",
    lineHeight: 12,
  },
  methodLabelDisabled: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#888",
  },
  soonBadge: {
    backgroundColor: "#f3f3f3",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  soonBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#aaa",
  },
});
