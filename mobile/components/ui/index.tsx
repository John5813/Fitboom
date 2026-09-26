import React from "react";
import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";

/*
 * Vebdagi shadcn komponentlarining (client/src/components/ui) React Native
 * nusxalari. O'lchamlar, radiuslar va ranglar vebdagi bilan bir xil —
 * mijoz saytga ham, ilovaga ham kirsa bir xil tugma va kartalarni ko'radi.
 *
 * Vebdagi manba:
 *   Button — ui/button.tsx   (rounded-md 6px, min-h-10, sm: min-h-9)
 *   Badge  — ui/badge.tsx    (rounded-md 6px, px-2.5 py-0.5, text-xs semibold)
 *   Card   — ui/card.tsx     (rounded-xl 12px, border card-border, shadow-sm)
 */

/** tailwind.config.ts dagi radiuslar (Tailwind standartidan farq qiladi) */
export const Radius = { sm: 3, md: 6, lg: 9, xl: 12, "2xl": 16, full: 999 } as const;

/**
 * Tilla — brend urg'usi (logo, kredit belgilari, premium tugmalar).
 * Vebda: text-gold-gradient, from-[#f3d9a4] via-[#d9a751] to-[#b98537].
 * Tilla fonda matn doim to'q (#1A1206) — oq matn o'qilmaydi.
 */
export const Gold = {
  light: "#F3D9A4",
  base: "#D9A751",
  deep: "#B98537",
  text: "#1A1206",
  gradient: ["#F3D9A4", "#D9A751", "#B98537"] as const,
} as const;

/** Vebdagi --font-sans (Inter) va --font-display (Oxanium) */
export const Font = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  display: "Oxanium_700Bold",
  displayExtra: "Oxanium_800ExtraBold",
} as const;

/** Vebdagi --secondary va --button-outline (tema bo'yicha) */
function useExtraTokens() {
  const { isDark } = useTheme();
  return isDark
    ? { secondary: "#263340", secondaryText: "#F0F2F4", outline: "rgba(255,255,255,0.10)" }
    : { secondary: "#F8F5ED", secondaryText: "#432F19", outline: "rgba(0,0,0,0.10)" };
}

type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost";
type ButtonSize = "default" | "sm" | "icon";

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  /** Vebda ikona odatda 16px (size-4); sarlavhadagi ikonalar 20px (w-5) */
  iconSize?: number;
  children?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export function Button({
  variant = "default",
  size = "default",
  icon: Icon,
  iconSize,
  children,
  onPress,
  disabled,
  style,
  textStyle,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const { theme } = useTheme();
  const x = useExtraTokens();

  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    default: { bg: theme.primary, fg: "#FFFFFF", border: theme.primaryDark },
    destructive: { bg: theme.error, fg: "#FFFFFF", border: theme.error },
    outline: { bg: "transparent", fg: theme.text, border: x.outline },
    secondary: { bg: x.secondary, fg: x.secondaryText, border: x.secondary },
    ghost: { bg: "transparent", fg: theme.text, border: "transparent" },
  };
  const c = palette[variant];

  const sizing: ViewStyle =
    size === "icon"
      ? { width: 40, height: 40 }
      : size === "sm"
        ? { minHeight: 36, paddingHorizontal: 12 }
        : { minHeight: 40, paddingHorizontal: 16, paddingVertical: 8 };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          borderRadius: Radius.md,
          borderWidth: 1,
          backgroundColor: c.bg,
          borderColor: c.border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        variant === "outline" && {
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
          elevation: 1,
        },
        sizing,
        style,
      ]}
    >
      {Icon ? <Icon size={iconSize ?? (size === "sm" ? 12 : 16)} color={c.fg} strokeWidth={2} /> : null}
      {children != null && (
        <Text
          style={[
            { color: c.fg, fontFamily: Font.medium, fontSize: size === "sm" ? 12 : 14 },
            textStyle,
          ]}
          numberOfLines={1}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}

export function Badge({
  children,
  style,
  textStyle,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          alignSelf: "flex-start",
          borderRadius: Radius.md,
          paddingHorizontal: 10,
          paddingVertical: 2,
          backgroundColor: theme.primary,
        },
        style,
      ]}
    >
      <Text style={[{ color: "#FFFFFF", fontSize: 12, fontFamily: Font.semibold }, textStyle]}>
        {children}
      </Text>
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: Radius.xl,
          borderWidth: 1,
          borderColor: theme.cardBorder,
          backgroundColor: theme.card,
          shadowColor: "#0F172A",
          shadowOpacity: 0.06,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
