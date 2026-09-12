import type { Request, Response, NextFunction } from 'express';
import type { Gym } from '@shared/schema';

/**
 * Oddiy in-memory rate limiter.
 * Loyiha bitta instansda ishlaydi (Replit autoscale bitta jarayon), shuning uchun
 * sms.ts dagi kabi xotiradagi hisoblagich yetarli. Ko'p instansga o'tilganda
 * buni Redis yoki DB ga ko'chirish kerak.
 */
interface RateEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Map<string, RateEntry>>();

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  /** Kalitni aniqlash — standart holatda IP manzil */
  keyFn?: (req: Request) => string;
}

export function rateLimit(name: string, options: RateLimitOptions) {
  const { windowMs, max, message = "Juda ko'p so'rov yuborildi. Birozdan keyin urinib ko'ring." } = options;
  const keyFn = options.keyFn || ((req: Request) => req.ip || req.socket.remoteAddress || 'unknown');

  if (!buckets.has(name)) buckets.set(name, new Map());
  const bucket = buckets.get(name)!;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyFn(req);
    const now = Date.now();
    const entry = bucket.get(key);

    if (!entry || now > entry.resetAt) {
      bucket.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count++;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ message, retryAfter });
    }

    next();
  };
}

// Eskirgan yozuvlarni vaqti-vaqti bilan tozalash
setInterval(() => {
  const now = Date.now();
  for (const bucket of buckets.values()) {
    for (const [key, entry] of bucket.entries()) {
      if (now > entry.resetAt) bucket.delete(key);
    }
  }
}, 5 * 60 * 1000).unref?.();

/**
 * Zal obyektidan maxfiy maydonlarni olib tashlash.
 *
 * `qrCode` — zalga kirishni tasdiqlaydigan sir; `ownerAccessCode` — zal egasi
 * panelining paroli. Ikkalasi ham hech qachon ommaviy javobga tushmasligi kerak.
 */
export function publicGym<T extends Partial<Gym>>(gym: T): Omit<T, 'qrCode' | 'ownerAccessCode'> {
  const { qrCode, ownerAccessCode, ...rest } = gym as any;
  return rest;
}

/** Zal yozuvida tashqaridan o'zgartirishga ruxsat etilgan maydonlar (mass-assignment himoyasi) */
export const GYM_ADMIN_EDITABLE_FIELDS = [
  'name', 'categories', 'credits', 'distance', 'hours', 'imageUrl', 'images',
  'address', 'description', 'facilities', 'latitude', 'longitude', 'closedDays',
] as const;

/** Zal egasi o'zgartira oladigan maydonlar */
export const GYM_OWNER_EDITABLE_FIELDS = ['name', 'imageUrl', 'images'] as const;

export function pickFields<T extends object>(source: T, allowed: readonly string[]): Partial<T> {
  const result: any = {};
  for (const key of allowed) {
    if (key in source && (source as any)[key] !== undefined) {
      result[key] = (source as any)[key];
    }
  }
  return result;
}
