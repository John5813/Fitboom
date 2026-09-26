/**
 * Profildagi rangli ikonka plitkalari — sayt va ilova bir xil ranglardan
 * foydalanadi (gradient: yuqori-chapdan pastki-o'ngga).
 *
 * Ilgari bu yerda och doira ichida ingichka chiziqli ikonka turardi va
 * foydalanuvchi uni "harfga o'xshaydi, juda sodda" deb baholadi.
 */
export const ICON_TILES = {
  phone: ["#38BDF8", "#2563EB"],
  name: ["#4ADE80", "#15803D"],
  gender: ["#C084FC", "#7C3AED"],
  age: ["#F3D9A4", "#B98537"],
  credits: ["#F3D9A4", "#B98537"],
  bookings: ["#60A5FA", "#1D4ED8"],
  done: ["#34D399", "#047857"],
  missed: ["#F87171", "#B91C1C"],
  expiry: ["#F3D9A4", "#B98537"],
} as const;

export type IconTileKind = keyof typeof ICON_TILES;
