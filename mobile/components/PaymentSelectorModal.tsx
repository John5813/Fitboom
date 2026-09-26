import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { Font, Radius } from "@/components/ui";

/*
 * To'lov usuli — vebdagi client/src/components/PaymentMethodDialog.tsx bilan
 * bir xil: markazdagi oyna, birinchi "Kartaga o'tkazish" (hozir ishlaydigan
 * yagona usul), keyin "Tez kunda qo'shiladi" ostida Click va Payme.
 */

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectCard: () => void;
}

export default function PaymentSelectorModal({ visible, onClose, onSelectCard }: Props) {
  const { theme } = useTheme();
  const handleCard = () => {
    onClose();
    setTimeout(onSelectCard, 300);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.dialog, { backgroundColor: theme.card }]} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>To'lov usulini tanlang</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Yopish" style={styles.close}>
              <X size={16} color={theme.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.body}>
            <Pressable
              onPress={handleCard}
              testID="button-payment-card"
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: theme.background, borderColor: theme.border },
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={[styles.logo, { backgroundColor: "#5B5FEF" }]}>
                <Text style={styles.kLetter}>K</Text>
              </View>
              <Text style={[styles.optionLabel, { color: theme.text }]}>Kartaga o'tkazish</Text>
            </Pressable>

            <Text style={[styles.soonTitle, { color: theme.textSecondary }]}>TEZ KUNDA QO'SHILADI</Text>

            <View style={[styles.option, styles.disabled, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.logo, { backgroundColor: "rgba(0,173,239,0.7)" }]}>
                <View style={styles.clickRow}>
                  <View style={styles.clickRing}>
                    <View style={styles.clickDot} />
                  </View>
                  <Text style={styles.clickText}>click</Text>
                </View>
              </View>
              <Text style={[styles.optionLabel, { color: theme.text, flex: 1 }]}>Click</Text>
              <Text style={[styles.soonChip, { color: theme.textSecondary, backgroundColor: theme.surface }]}>Yaqinda</Text>
            </View>

            <View style={[styles.option, styles.disabled, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.logo, { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: theme.border }]}>
                <View style={styles.paymeRow}>
                  <Text style={styles.payText}>Pay</Text>
                  <Text style={styles.meText}>me</Text>
                </View>
              </View>
              <Text style={[styles.optionLabel, { color: theme.text, flex: 1 }]}>Payme</Text>
              <Text style={[styles.soonChip, { color: theme.textSecondary, backgroundColor: theme.surface }]}>Yaqinda</Text>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", alignItems: "center", justifyContent: "center", padding: 16 },
  // w-[92vw] max-w-[380px] rounded-3xl shadow-xl
  dialog: {
    width: "92%",
    maxWidth: 380,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 20 },
    elevation: 12,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
  title: { fontSize: 20, fontFamily: Font.bold, textAlign: "center" },
  close: { position: "absolute", right: 16, top: 16 },
  body: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: Radius["2xl"],
    borderWidth: 1,
  },
  disabled: { opacity: 0.5 },
  logo: { width: 56, height: 56, borderRadius: Radius["2xl"], alignItems: "center", justifyContent: "center" },
  kLetter: { color: "#FFFFFF", fontSize: 24, fontFamily: Font.bold },
  optionLabel: { fontSize: 16, fontFamily: Font.semibold },
  soonTitle: { textAlign: "center", fontSize: 12, fontFamily: Font.medium, letterSpacing: 0.6, paddingTop: 8, paddingBottom: 4 },
  soonChip: { fontSize: 12, fontFamily: Font.regular, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: "hidden" },
  clickRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  clickRing: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  clickDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: "#FFFFFF" },
  clickText: { color: "#FFFFFF", fontSize: 14, fontFamily: Font.bold, lineHeight: 16 },
  paymeRow: { flexDirection: "row", alignItems: "flex-end" },
  payText: { color: "#111827", fontSize: 16, fontFamily: Font.bold, lineHeight: 18 },
  meText: {
    color: "#1B61F5",
    fontSize: 14,
    fontFamily: Font.bold,
    lineHeight: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#1B61F5",
  },
});
