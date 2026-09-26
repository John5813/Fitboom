import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ShieldCheck } from "lucide-react-native";
import { formatRemainingShort, passRemainingMs, type AccessPass } from "@shared/accessPass";
import { Font, Radius } from "@/components/ui";

/**
 * Ruxsatnoma yopilgandan keyin 1 soat davomida ekran burchagida turadi.
 * Vebdagi AccessPassBubble.tsx bilan bir xil; pastki menyudan yuqorida.
 */
export default function AccessPassBubble({ pass, onOpen }: { pass: AccessPass; onOpen: () => void }) {
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(() => Date.now());
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (reduce) return;
        loop = Animated.loop(
          Animated.timing(pulse, { toValue: 1, duration: 2200, useNativeDriver: true }),
        );
        loop.start();
      });
    return () => loop?.stop();
  }, [pulse]);

  const bottom = 88 + (Platform.OS === "web" ? 0 : insets.bottom);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pulse,
          {
            opacity: pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.45, 0, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.25, 1.25] }) }],
          },
        ]}
      />
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${pass.gymName} — kirish ruxsatnomasini ochish`}
        style={({ pressed }) => [styles.bubble, pressed && { transform: [{ scale: 0.95 }] }]}
        testID="button-access-pass-bubble"
      >
        <View style={styles.icon}>
          <ShieldCheck size={20} color="#FFFFFF" />
        </View>
        <View>
          <Text style={styles.title}>Kirish ruxsati</Text>
          <Text style={styles.sub}>{formatRemainingShort(passRemainingMs(pass, now))}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", right: 16, zIndex: 90 },
  pulse: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radius.full,
    backgroundColor: "#16A34A",
  },
  // bg-green-600 rounded-full py-2 pl-2 pr-4 shadow-lg
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 16,
    borderRadius: Radius.full,
    backgroundColor: "#16A34A",
    shadowColor: "#14532D",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: "#FFFFFF", fontSize: 12, lineHeight: 15, fontFamily: Font.bold },
  sub: { color: "rgba(255,255,255,0.8)", fontSize: 11, lineHeight: 14, fontFamily: Font.regular },
});
