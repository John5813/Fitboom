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

import Colors from "@/constants/Colors";
import { useLanguage } from "@/contexts/LanguageContext";

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const TAB_BOTTOM_INSET = Platform.OS === "web" ? 0 : insets.bottom;

  const tabs = [
    { name: "index",    icon: "home",     label: t("nav.home") },
    { name: "gyms",     icon: "activity", label: t("nav.gyms") },
    { name: "scanner",  icon: "camera",   label: t("nav.scanner"), isCenter: true },
    { name: "courses",  icon: "video",    label: t("nav.classes") },
    { name: "bookings", icon: "calendar", label: t("nav.bookings") },
  ] as const;

  const visibleRoutes = state.routes.filter((r) =>
    tabs.some((t) => t.name === r.name)
  );

  return (
    <View
      style={[
        styles.tabBar,
        { paddingBottom: TAB_BOTTOM_INSET, height: 64 + TAB_BOTTOM_INSET },
      ]}
    >
      {tabs.map((tab) => {
        const route = visibleRoutes.find((r) => r.name === tab.name);
        if (!route) return null;

        const index = state.routes.indexOf(route);
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (tab.isCenter) {
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={onPress}
              style={styles.centerBtnWrapper}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.centerBtn,
                  isFocused && styles.centerBtnActive,
                ]}
              >
                <Feather
                  name={tab.icon}
                  size={26}
                  color={isFocused ? "#fff" : "rgba(255,255,255,0.9)"}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: isFocused ? Colors.primary : Colors.textSecondary },
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
              color={isFocused ? Colors.primary : Colors.textSecondary}
              strokeWidth={isFocused ? 2.5 : 1.8}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: isFocused ? Colors.primary : Colors.textSecondary },
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
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#10101e",
    borderTopWidth: 1,
    borderTopColor: "#1e1e38",
    alignItems: "center",
    paddingHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
    gap: 3,
  },
  centerBtnWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: -28,
    gap: 3,
  },
  centerBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#1e1e38",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#10101e",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 12,
  },
  centerBtnActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.6,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.1,
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
      <Tabs.Screen name="scanner" />
      <Tabs.Screen name="courses" />
      <Tabs.Screen name="bookings" />
      <Tabs.Screen name="map" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
