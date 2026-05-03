import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = "100%", height = 16, radius = 8, style }: SkeletonProps) {
  const { isDark } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.55, 1]),
  }));

  const baseColor = isDark ? "#1E2B47" : "#E5E7EB";

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius: radius, backgroundColor: baseColor },
        animatedStyle,
        style,
      ]}
    />
  );
}

interface GymCardSkeletonProps {
  count?: number;
}

export function GymCardSkeleton({ count = 3 }: GymCardSkeletonProps) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: 14 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.cardWrap,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
          ]}
        >
          <Skeleton height={150} radius={0} style={{ marginBottom: 12 }} />
          <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 8 }}>
            <Skeleton width="70%" height={18} />
            <Skeleton width="45%" height={12} />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <Skeleton width={120} height={38} radius={10} />
              <Skeleton width={120} height={38} radius={10} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export function BookingCardSkeleton({ count = 3 }: { count?: number }) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.bookingCard,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
          ]}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
            <Skeleton width="55%" height={18} />
            <Skeleton width={70} height={22} radius={11} />
          </View>
          <Skeleton width="40%" height={13} style={{ marginBottom: 6 }} />
          <Skeleton width="60%" height={13} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  bookingCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
});
