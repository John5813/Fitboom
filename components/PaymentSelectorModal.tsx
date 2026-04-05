import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectCard: () => void;
}

const METHODS = [
  {
    id: "click",
    label: "Click",
    icon: "smartphone" as const,
    color: "#7C3AED",
    bgColor: "#ede9fe",
    available: false,
  },
  {
    id: "payme",
    label: "Payme",
    icon: "credit-card" as const,
    color: "#e11d48",
    bgColor: "#ffe4e6",
    available: false,
  },
  {
    id: "card",
    label: "Karta orqali",
    icon: "layers" as const,
    color: "#16a34a",
    bgColor: "#dcfce7",
    available: true,
  },
];

export default function PaymentSelectorModal({ visible, onClose, onSelectCard }: Props) {
  const handleCard = () => {
    onClose();
    setTimeout(onSelectCard, 300);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={styles.title}>To'lov usulini tanlang</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.methodsContainer}>
            {METHODS.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.methodRow,
                  !method.available && styles.methodRowDisabled,
                ]}
                onPress={method.available ? handleCard : undefined}
                activeOpacity={method.available ? 0.75 : 1}
              >
                <View style={[styles.iconBox, { backgroundColor: method.bgColor }]}>
                  <Feather
                    name={method.icon}
                    size={22}
                    color={method.available ? method.color : "#9ca3af"}
                  />
                </View>

                <View style={styles.methodInfo}>
                  <Text
                    style={[
                      styles.methodLabel,
                      !method.available && styles.methodLabelDisabled,
                    ]}
                  >
                    {method.label}
                  </Text>
                  {!method.available && (
                    <Text style={styles.comingSoon}>Tez orada</Text>
                  )}
                </View>

                {method.available ? (
                  <View style={styles.activeChevron}>
                    <Feather name="chevron-right" size={18} color="#16a34a" />
                  </View>
                ) : (
                  <View style={styles.soonBadge}>
                    <Text style={styles.soonBadgeText}>Tez orada</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.footNote}>
            Barcha to'lovlar xavfsiz kanal orqali amalga oshiriladi
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e5e7eb",
    alignSelf: "center",
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#111827",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },

  methodsContainer: {
    gap: 10,
  },
  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#f9fafb",
    borderWidth: 1.5,
    borderColor: "#f3f4f6",
  },
  methodRowDisabled: {
    opacity: 0.65,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  methodInfo: {
    flex: 1,
    gap: 2,
  },
  methodLabel: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#111827",
  },
  methodLabelDisabled: {
    color: "#9ca3af",
  },
  comingSoon: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#9ca3af",
  },
  activeChevron: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  soonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
  },
  soonBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#9ca3af",
  },
  footNote: {
    marginTop: 20,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#9ca3af",
    textAlign: "center",
  },
});
