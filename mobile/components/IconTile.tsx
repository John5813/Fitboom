import React from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { LucideIcon } from "lucide-react-native";
import { ICON_TILES, type IconTileKind } from "@shared/iconTiles";
import { Radius } from "@/components/ui";

/** Rangli gradient plitka ichida oq ikonka (vebda: client/src/components/IconTile.tsx) */
export default function IconTile({
  icon: Icon,
  kind,
  colors,
  size = 40,
}: {
  icon: LucideIcon;
  kind?: IconTileKind;
  /** kind o'rniga aniq ranglar */
  colors?: readonly [string, string];
  size?: number;
}) {
  const [from, to] = colors ?? ICON_TILES[kind ?? "name"];
  return (
    <View
      style={{
        borderRadius: Radius.xl,
        shadowColor: to,
        shadowOpacity: 0.45,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      }}
    >
      <LinearGradient
        colors={[from, to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: size, height: size, borderRadius: Radius.xl, alignItems: "center", justifyContent: "center" }}
      >
        <Icon size={size * 0.5} color="#FFFFFF" strokeWidth={2.25} />
      </LinearGradient>
    </View>
  );
}
