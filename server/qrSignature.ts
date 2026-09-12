import crypto from 'crypto';

/**
 * Zal QR kodlarini HMAC bilan imzolash.
 *
 * Ilgari QR kod shunchaki `{"gymId": "..."}` JSON edi va gym ID lar `/api/gyms`
 * orqali ommaviy edi — ya'ni foydalanuvchi zalga bormasdan o'zi QR "yasab",
 * bronni yopishi va zalga pul hisoblanishiga sabab bo'lishi mumkin edi.
 *
 * Endi QR kod ichida `nonce` va `sig` bor; `sig` ni faqat server hisoblay oladi.
 */

function getSecret(): string {
  const secret = process.env.QR_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('QR_SECRET yoki SESSION_SECRET sozlanmagan — QR imzolash ishlamaydi');
  }
  return secret;
}

export interface GymQrPayload {
  gymId: string;
  type: 'gym';
  name: string;
  nonce: string;
  sig: string;
}

export function signGymQr(gymId: string, nonce: string): string {
  return crypto
    .createHmac('sha256', getSecret())
    .update(`gym:${gymId}:${nonce}`)
    .digest('hex')
    .slice(0, 32);
}

/** Zal uchun yangi imzolangan QR kod matnini yaratadi */
export function createGymQr(gymId: string, name: string): string {
  const nonce = crypto.randomBytes(12).toString('hex');
  const payload: GymQrPayload = {
    gymId,
    type: 'gym',
    name,
    nonce,
    sig: signGymQr(gymId, nonce),
  };
  return JSON.stringify(payload);
}

/**
 * Skanerlangan QR kod imzosini tekshiradi.
 * Imzosi yo'q eski QR kodlar uchun `false` qaytaradi — bunday holatda
 * chaqiruvchi kod saqlangan qiymat bilan aynan mosligini tekshiradi.
 */
export function verifyGymQr(qrData: any): boolean {
  if (!qrData || typeof qrData !== 'object') return false;
  const { gymId, nonce, sig } = qrData;
  if (typeof gymId !== 'string' || typeof nonce !== 'string' || typeof sig !== 'string') {
    return false;
  }
  const expected = signGymQr(gymId, nonce);
  // Vaqt hujumlaridan himoya uchun doimiy vaqtli taqqoslash
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Skanerlangan QR haqiqiyligini aniqlaydi: imzo to'g'ri bo'lsa yoki
 * bazadagi saqlangan QR bilan aynan mos kelsa — haqiqiy.
 */
export function isAuthenticGymQr(scannedRaw: string, qrData: any, storedQr: string | null): boolean {
  if (verifyGymQr(qrData)) return true;
  if (!storedQr) return false;
  // Eski (imzosiz) QR kodlar uchun: saqlangan matn bilan aynan mos kelishi shart.
  // storedQr endi hech qayerda ommaviy ko'rsatilmaydi, shuning uchun uni
  // tashqaridan taxmin qilib bo'lmaydi.
  const a = Buffer.from(scannedRaw.trim());
  const b = Buffer.from(storedQr.trim());
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
