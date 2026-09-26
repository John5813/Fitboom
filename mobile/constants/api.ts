/**
 * Server manzili — ilovaning barcha so'rovlari shu yerdan oladi.
 *
 * Ilgari bu manzil 5 ta faylda alohida qattiq yozilgan edi. Server manzili
 * o'zgarsa, bittasi esdan chiqib qolsa, ilovaning bir qismi eski serverga
 * ulanib qolardi.
 *
 * Boshqa serverga ulash (masalan, sinov uchun):
 *   EXPO_PUBLIC_API_ORIGIN=http://192.168.1.10:5000 npx expo start
 */
export const API_ORIGIN = (
  process.env.EXPO_PUBLIC_API_ORIGIN || "https://fitboom-absdefgx7.replit.app"
).replace(/\/+$/, "");

/** Mobil API: server/mobileRoutes.ts */
export const MOBILE_API_URL = `${API_ORIGIN}/api/mobile/v1`;
