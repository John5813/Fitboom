import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import Svg, { Path } from "react-native-svg";
import { Clock, ShieldCheck, User, X } from "lucide-react-native";
import { formatRemaining, passRemainingMs, tashkentClock, type AccessPass } from "@shared/accessPass";
import { Font, Gold, Radius } from "@/components/ui";

/*
 * Administratorga ko'rsatiladigan jonli ruxsatnoma — vebdagi
 * client/src/components/AccessPassOverlay.tsx bilan bir xil.
 *
 * "Jonli" bo'lishi muhim: katta soat har soniyada yuradi, chiziq doim
 * harakatda, "Jonli" belgisi miltillaydi. Skrinshot qotib qoladi —
 * administrator uni birdan farqlaydi.
 */

const AnimatedPath = Animated.createAnimatedComponent(Path);
const KEEP_AWAKE_TAG = "fitboom-access-pass";
const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

export default function AccessPassOverlay({
  pass,
  visible,
  onClose,
}: {
  pass: AccessPass;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(() => Date.now());
  const [barWidth, setBarWidth] = useState(0);

  const pop = useRef(new Animated.Value(0)).current;
  const draw = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const live = useRef(new Animated.Value(0)).current;

  // Soat har soniyada
  useEffect(() => {
    if (!visible) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [visible]);

  // Ko'rsatayotganda ekran o'chib qolmasin
  useEffect(() => {
    if (!visible) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [visible]);

  // Animatsiyalar: kirishda belgi "otilib" chiqadi va chiziladi, keyin
  // to'lqinlar, chiziq va "Jonli" nuqtasi doim harakatda
  useEffect(() => {
    if (!visible) return;
    const loops: Animated.CompositeAnimation[] = [];
    let cancelled = false;
    pop.setValue(0);
    draw.setValue(0);

    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          pop.setValue(1);
          draw.setValue(1);
          return;
        }
        Animated.sequence([
          Animated.spring(pop, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
        ]).start();
        Animated.timing(draw, {
          toValue: 1,
          duration: 450,
          delay: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false, // SVG strokeDashoffset
        }).start();

        const ring = (v: Animated.Value, delay: number) =>
          Animated.loop(
            Animated.sequence([
              Animated.delay(delay),
              Animated.timing(v, { toValue: 1, duration: 2000, easing: Easing.out(Easing.quad), useNativeDriver: true }),
              Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
            ]),
          );
        loops.push(ring(ring1, 600), ring(ring2, 1600));
        loops.push(
          Animated.loop(
            Animated.timing(shimmer, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true }),
          ),
        );
        loops.push(
          Animated.loop(
            Animated.sequence([
              Animated.timing(live, { toValue: 1, duration: 600, useNativeDriver: true }),
              Animated.timing(live, { toValue: 0, duration: 600, useNativeDriver: true }),
            ]),
          ),
        );
        loops.forEach((l) => l.start());
      });

    return () => {
      cancelled = true;
      loops.forEach((l) => l.stop());
      [ring1, ring2, shimmer, live].forEach((v) => v.setValue(0));
    };
  }, [visible, pop, draw, ring1, ring2, shimmer, live]);

  const clock = tashkentClock(now);
  const checkedIn = tashkentClock(pass.checkedInAt);
  const remaining = passRemainingMs(pass, now);

  const ringStyle = (v: Animated.Value) => ({
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
  });

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="overFullScreen" transparent onRequestClose={onClose}>
      <View style={styles.root} testID="access-pass-overlay">
        {/* Yashil va tilla nur (vebdagi radial-gradient) */}
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(34,197,94,0.28)", "rgba(7,8,13,0)", "rgba(7,8,13,0)", "rgba(217,167,81,0.16)"]}
          locations={[0, 0.45, 0.75, 1]}
          style={StyleSheet.absoluteFill}
        />
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: Math.max(16, insets.top), paddingBottom: Math.max(24, insets.bottom) },
          ]}
        >
          <View style={styles.topBar}>
            <Text style={styles.wordmark}>
              <Text style={{ color: "#FFFFFF" }}>Fit</Text>
              <Text style={{ color: Gold.base }}>Boom</Text>
            </Text>
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Yopish">
              <X size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={styles.badgeWrap}>
            <Animated.View style={[styles.ring, ringStyle(ring1)]} />
            <Animated.View style={[styles.ring, styles.ring2, ringStyle(ring2)]} />
            <Animated.View
              style={{
                opacity: pop.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
                transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
              }}
            >
              <LinearGradient colors={["#4ADE80", "#16A34A", "#166534"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badge}>
                <Svg width={56} height={56} viewBox="0 0 52 52">
                  <AnimatedPath
                    d="M14 27 l8 8 l16 -18"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={48}
                    strokeDashoffset={draw.interpolate({ inputRange: [0, 1], outputRange: [48, 0] })}
                  />
                </Svg>
              </LinearGradient>
            </Animated.View>
          </View>

          <Text style={styles.title}>Kirish tasdiqlandi</Text>
          <Text style={styles.gym}>{pass.gymName}</Text>

          {/* Jonli soat */}
          <View style={styles.clockCard}>
            <View style={styles.liveRow}>
              <Animated.View style={[styles.liveDot, { opacity: live.interpolate({ inputRange: [0, 1], outputRange: [1, 0.25] }) }]} />
              <Text style={styles.liveText}>JONLI RUXSATNOMA</Text>
            </View>
            <Text style={styles.clock}>{clock.hms}</Text>
            <Text style={styles.date}>{clock.date}</Text>
            <View style={styles.bar} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
              <Animated.View
                style={[
                  styles.shimmer,
                  {
                    width: barWidth / 2,
                    transform: [
                      { translateX: shimmer.interpolate({ inputRange: [0, 1], outputRange: [-barWidth / 2, barWidth] }) },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={["rgba(217,167,81,0)", Gold.base, "rgba(217,167,81,0)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            </View>
          </View>

          <View style={styles.grid}>
            <Info label="Mijoz" value={pass.userName || "—"} />
            <Info label="Bron vaqti" value={pass.slot || "—"} />
            <Info label="Kirgan vaqti" value={checkedIn.hm} />
            <Info label="Amal qiladi" value={formatRemaining(remaining)} highlight icon />
          </View>

          <View style={styles.hint}>
            <User size={20} color="#E2B86A" />
            <Text style={styles.hintText}>Ushbu oynani zal administratoriga ko'rsating</Text>
          </View>

          <View style={{ flexGrow: 1 }} />

          <Pressable onPress={onClose} style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.85 }]} accessibilityRole="button">
            <ShieldCheck size={20} color="#4ADE80" />
            <Text style={styles.doneText}>Yopish</Text>
          </Pressable>
          <Text style={styles.footnote}>Ruxsatnoma 1 soat davomida ekrandagi yashil tugma orqali qayta ochiladi</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Info({ label, value, highlight, icon }: { label: string; value: string; highlight?: boolean; icon?: boolean }) {
  return (
    <View style={styles.cell}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {icon && <Clock size={12} color="rgba(255,255,255,0.5)" />}
        <Text style={styles.cellLabel}>{label}</Text>
      </View>
      <Text style={[styles.cellValue, highlight && { color: "#4ADE80", fontVariant: ["tabular-nums"] }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07080d" },
  content: { flexGrow: 1, paddingHorizontal: 20, maxWidth: 420, width: "100%", alignSelf: "center" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  wordmark: { fontSize: 20, fontFamily: Font.displayExtra, fontStyle: "italic" },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeWrap: { marginTop: 32, alignSelf: "center", width: 112, height: 112, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 112, height: 112, borderRadius: 56, borderWidth: 2, borderColor: "rgba(74,222,128,0.6)" },
  ring2: { borderColor: "rgba(74,222,128,0.4)" },
  badge: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#22C55E",
    shadowOpacity: 0.45,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  title: { marginTop: 24, textAlign: "center", color: "#FFFFFF", fontSize: 30, lineHeight: 36, fontFamily: Font.displayExtra },
  gym: { marginTop: 4, textAlign: "center", color: Gold.base, fontSize: 20, lineHeight: 26, fontFamily: Font.display },
  clockCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
  },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#4ADE80" },
  liveText: { color: "#4ADE80", fontSize: 11, letterSpacing: 2.2, fontFamily: Font.semibold },
  clock: { marginTop: 8, color: "#FFFFFF", fontSize: 48, lineHeight: 56, fontFamily: MONO, fontWeight: "700", fontVariant: ["tabular-nums"] },
  date: { marginTop: 4, color: "rgba(255,255,255,0.5)", fontSize: 14, fontFamily: Font.regular },
  bar: { marginTop: 16, height: 6, width: "100%", borderRadius: 3, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.1)" },
  shimmer: { position: "absolute", top: 0, bottom: 0, borderRadius: 3, overflow: "hidden" },
  grid: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  cell: { width: "47.5%", flexGrow: 1, padding: 12, borderRadius: Radius.xl, backgroundColor: "rgba(255,255,255,0.04)" },
  cellLabel: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: Font.regular },
  cellValue: { marginTop: 2, color: "#FFFFFF", fontSize: 14, fontFamily: Font.semibold },
  hint: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: "rgba(217,167,81,0.3)",
    backgroundColor: "rgba(217,167,81,0.1)",
  },
  hintText: { flex: 1, color: "rgba(255,255,255,0.85)", fontSize: 14, fontFamily: Font.regular },
  doneBtn: {
    marginTop: 24,
    height: 48,
    borderRadius: Radius.xl,
    backgroundColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  doneText: { color: "#FFFFFF", fontSize: 16, fontFamily: Font.semibold },
  footnote: { marginTop: 8, textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: Font.regular },
});
