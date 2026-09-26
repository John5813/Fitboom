import { Tabs } from "expo-router";
import React from "react";
import { Platform, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Home, Dumbbell, QrCode, Video, Calendar, type LucideIcon } from "lucide-react-native";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { haptics } from "@/hooks/useHaptics";

/*
 * Pastki menyu — vebdagi client/src/components/BottomNav.tsx bilan bir xil:
 * bir xil ikonalar (lucide), o'lchamlar, ranglar va o'rtadagi QR tugma.
 * Birini o'zgartirsangiz, ikkinchisini ham o'zgartiring.
 */

type TabDef = {
  name: string;
  icon: LucideIcon;
  label: string;
  isCenter?: boolean;
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { theme, isDark } = useTheme();
  const bottomInset = Platform.OS === "web" ? 0 : insets.bottom;

  const tabs: TabDef[] = [
    { name: "index", icon: Home, label: t("nav.home") },
    { name: "gyms", icon: Dumbbell, label: t("nav.gyms") },
    { name: "scanner", icon: QrCode, label: t("nav.scanner"), isCenter: true },
    { name: "courses", icon: Video, label: t("nav.classes") },
    { name: "bookings", icon: Calendar, label: t("nav.bookings") },
  ];

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: 8 + bottomInset,
          backgroundColor: theme.background,
          borderTopColor: theme.border,
        },
      ]}
    >
      {tabs.map((tab) => {
        const route = state.routes.find((r) => r.name === tab.name);
        if (!route) return null;
        const idx = state.routes.indexOf(route);
        const focused = state.index === idx;
        const color = focused ? theme.primary : theme.textSecondary;
        const Icon = tab.icon;

        const onPress = () => {
          haptics.select();
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (tab.isCenter) {
          // Vebda: faol bo'lmasa bg-gray-900 (tungi rejimda bg-gray-100)
          const circleBg = focused ? theme.primary : isDark ? "#F3F4F6" : "#111827";
          const iconColor = focused ? "#FFFFFF" : isDark ? "#111827" : "#FFFFFF";
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={onPress}
              style={styles.centerWrapper}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
            >
              <View style={[styles.centerCircle, { backgroundColor: circleBg, borderColor: theme.background }]}>
                <Icon size={24} color={iconColor} strokeWidth={2} />
              </View>
              <Text style={[styles.label, { color, marginTop: 2 }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={tab.name}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
          >
            <Icon size={20} color={color} strokeWidth={focused ? 2.5 : 1.8} />
            <Text style={[styles.label, { color }]} numberOfLines={1}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Vebda: flex items-end justify-around px-1 pb-2 pt-1, border-t, soya yuqoriga
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingHorizontal: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  centerWrapper: {
    flex: 1,
    alignItems: "center",
    marginTop: -16,
  },
  centerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    lineHeight: 12,
    textAlign: "center",
  },
});

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="gyms" />
      {/* unmountOnBlur React Navigation 7 da yo'q — kamera scanner.tsx da useIsFocused bilan o'chiriladi */}
      <Tabs.Screen name="scanner" />
      <Tabs.Screen name="courses" />
      <Tabs.Screen name="bookings" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="map" />
    </Tabs>
  );
}
