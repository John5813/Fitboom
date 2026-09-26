import React, { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

interface Props {
  index?: number;
  delay?: number;
  children: React.ReactNode;
}

export function AnimatedListItem({ index = 0, delay = 0, children }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    const totalDelay = delay + index * 60;
    opacity.value = withDelay(totalDelay, withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) }));
    translateY.value = withDelay(totalDelay, withTiming(0, { duration: 350, easing: Easing.out(Easing.ease) }));
  }, [opacity, translateY, delay, index]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
