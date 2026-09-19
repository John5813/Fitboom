/**
 * Xatolarni qayd etish va admin'ga xabar berish.
 *
 * Tashqi xizmat (Sentry va h.k.) o'rniga o'z jurnalimiz ishlatiladi: xatolar
 * bazaga yoziladi, admin panelida ko'rinadi va yangi xato birinchi marta
 * uchraganda Telegram'ga ogohlantirish tushadi — jamoa allaqachon shu yerda.
 */
import crypto from 'crypto';
import type { IStorage } from './storage';

/**
 * Bir xil xatoni birlashtirish uchun barmoq izi.
 *
 * Stack'ning faqat birinchi qatori olinadi — shunda bir xil xato turli
 * so'rovlarda (turli ID lar bilan) bitta yozuvga tushadi.
 */
export function fingerprintOf(message: string, stack?: string | null): string {
  const topFrame = (stack || '')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.startsWith('at ')) || '';

  // Raqamlar va UUID larni olib tashlaymiz: "user abc-123 topilmadi" va
  // "user def-456 topilmadi" bir xil xato hisoblanishi kerak
  const normalized = `${message}|${topFrame}`
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    // 4+ xonali raqamlar — ID va vaqt belgilari, ular birlashtiriladi.
    // 3 xonalilar saqlanadi: HTTP 404 va HTTP 500 — turli muammolar.
    .replace(/\d{4,}/g, ':num');

  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 32);
}

/** Telegram ogohlantirishlari uchun soatlik chegara */
const ALERT_LIMIT_PER_HOUR = 10;
let alertWindowStart = Date.now();
let alertsSentInWindow = 0;

function canSendAlert(): boolean {
  const now = Date.now();
  if (now - alertWindowStart > 3600_000) {
    alertWindowStart = now;
    alertsSentInWindow = 0;
  }
  if (alertsSentInWindow >= ALERT_LIMIT_PER_HOUR) return false;
  alertsSentInWindow++;
  return true;
}

export interface CapturedError {
  source: 'server' | 'client';
  message: string;
  stack?: string | null;
  context?: string | null;
  userId?: string | null;
}

/**
 * Xatoni qayd etadi. Hech qachon istisno tashlamaydi — xato qayd etishdagi
 * muammo asosiy so'rovni buzmasligi kerak.
 */
export async function captureError(storage: IStorage, error: CapturedError): Promise<void> {
  try {
    const message = String(error.message).slice(0, 500);
    const stack = error.stack ? String(error.stack).slice(0, 4000) : null;
    const fingerprint = fingerprintOf(message, stack);

    const { isNew, count } = await storage.recordError({
      source: error.source,
      message,
      stack,
      context: error.context?.slice(0, 300) ?? null,
      userId: error.userId ?? null,
      fingerprint,
    });

    // Ogohlantirish faqat yangi xato uchun — takrorlanganda jim qayd etiladi
    if (isNew && canSendAlert()) {
      const { notifyAdminsOfError } = await import('./telegram');
      await notifyAdminsOfError({ message, context: error.context ?? undefined, source: error.source, count });
    }
  } catch (err: any) {
    console.error('[ErrorTracking] Xatoni qayd etib bo\'lmadi:', err?.message);
  }
}
