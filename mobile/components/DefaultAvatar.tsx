import React from "react";
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";

/**
 * Rasm yuklanmagan foydalanuvchi uchun avatar: qorong'i fonda tilla
 * gradientli siymo. Vebdagi client/src/components/DefaultAvatar.tsx bilan
 * bir xil shakl.
 */
export default function DefaultAvatar({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#1E293B" />
          <Stop offset="1" stopColor="#020617" />
        </LinearGradient>
        <LinearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F3D9A4" />
          <Stop offset="0.55" stopColor="#D9A751" />
          <Stop offset="1" stopColor="#8A5E22" />
        </LinearGradient>
        <ClipPath id="clip">
          <Circle cx="50" cy="50" r="50" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#clip)">
        <Rect width="100" height="100" fill="url(#bg)" />
        <Circle cx="50" cy="40" r="17" fill="url(#fg)" />
        <Path d="M14 104 C14 76 30 62 50 62 C70 62 86 76 86 104 Z" fill="url(#fg)" />
      </G>
    </Svg>
  );
}
