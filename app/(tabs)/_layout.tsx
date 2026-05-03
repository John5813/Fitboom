import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { haptics } from "@/hooks/useHaptics";

type TabDef = {
  name: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  isCenter?: boolean;
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { theme, isDark } = useTheme();
  const TAB_BOTTOM = Platform.OS === "web" ? 0 : insets.bottom;
  const BRAND = theme.primary;

  const tabs: TabDef[] = [
    { name: "index",    icon: "home",        label: "Asosiy" },
    { name: "gyms",     icon: "activity",    label: "Zallar" },
    { name: "scanner",  icon: "grid",        label: "Skaner",       isCenter: true },
    { name: "courses",  icon: "play-circle", label: "Video darslar" },
    { name: "bookings", icon: "calendar",    label: "Bronlar" },
  ];

  const inactiveColor = isDark ? "#64748B" : "#999";

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: TAB_BOTTOM,
          height: 64 + TAB_BOTTOM,
          backgroundColor: theme.card,
          borderTopColor: theme.cardBorder,
        },
      ]}
    >
      {tabs.map((tab) => {
        const route = state.routes.find((r) => r.name === tab.name);
        if (!route) return null;
        const idx = state.routes.indexOf(route);
        const focused = state.index === idx;

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
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={onPress}
              style={styles.centerWrapper}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.centerCircle,
                  { borderColor: theme.card },
                  focused && {
                    backgroundColor: BRAND,
                    shadowColor: BRAND,
                    shadowOpacity: 0.5,
                  },
                ]}
              >
                <Feather name={tab.icon} size={26} color="#fff" />
              </View>
              <Text
                style={[
                  styles.label,
                  { color: inactiveColor },
                  focused && { color: BRAND },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={tab.name}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <Feather
              name={tab.icon}
              size={21}
              color={focused ? BRAND : inactiveColor}
            />
            <Text
              style={[
                styles.label,
                { color: inactiveColor },
                focused && { color: BRAND },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: 1,
    alignItems: "center",
    paddingHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    gap: 3,
  },
  centerWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: -28,
    gap: 3,
  },
  centerCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  label: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
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
      <Tabs.Screen name="scanner" options={{ unmountOnBlur: true }} />
      <Tabs.Screen name="courses" />
      <Tabs.Screen name="bookings" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="map" />
    </Tabs>
  );
}
