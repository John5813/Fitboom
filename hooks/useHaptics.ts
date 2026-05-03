import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

const isMobile = Platform.OS === "ios" || Platform.OS === "android";

export const haptics = {
  light: () => {
    if (isMobile) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  medium: () => {
    if (isMobile) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  heavy: () => {
    if (isMobile) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  },
  success: () => {
    if (isMobile) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  warning: () => {
    if (isMobile) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
  error: () => {
    if (isMobile) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
  select: () => {
    if (isMobile) Haptics.selectionAsync().catch(() => {});
  },
};
