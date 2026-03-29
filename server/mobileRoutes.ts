/**
 * FitBoom Mobile API v1
 * Base URL: /api/mobile/v1
 *
 * Auth: Bearer <accessToken> header for protected endpoints
 *
 * Response format:
 *   Success: { success: true, data: {...} }
 *   Error:   { success: false, error: "..." }
 */

import type { Express } from 'express';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { storage } from './storage';
import { sendSmsCode, verifySmsCode, normalizePhone } from './sms';
import { sendPaymentReceiptToAdmin, getAppUrl } from './telegram';
import { objectStorageClient } from './replit_integrations/object_storage';
import {
  requireMobileAuth,
  generateTokenPair,
  generateAccessToken,
  verifyToken,
  mobileSuccess,
  mobileError,
} from './mobileAuth';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const avatarUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function fixImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${getAppUrl()}${url}`;
}

function fixGymImages(gym: any): any {
  return {
    ...gym,
    imageUrl: fixImageUrl(gym.imageUrl),
    images: (gym.images || []).map((img: string) => fixImageUrl(img)),
  };
}

const ALLOWED_CREDIT_PACKAGES = [60, 130, 240];

const CREDIT_PRICES: Record<number, number> = {
  60: 60000,
  130: 130000,
  240: 240000,
};

function getTashkentNow(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 5 * 3600000);
}

function getTashkentDateStr(d?: Date): string {
  const t = d || getTashkentNow();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const day = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getTashkentTimeStr(d?: Date): string {
  const t = d || getTashkentNow();
  return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
}

async function uploadToObjectStorage(file: Express.Multer.File, folder = 'images'): Promise<string> {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
  if (bucketId) {
    const bucket = objectStorageClient.bucket(bucketId);
    const blob = bucket.file(`${folder}/${uniqueName}`);
    await blob.save(file.buffer, { contentType: file.mimetype, metadata: { cacheControl: 'public, max-age=31536000' } });
  }
  return `/api/images/${uniqueName}`;
}

async function saveReceiptFile(file: Express.Multer.File): Promise<string> {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
  if (bucketId) {
    const bucket = objectStorageClient.bucket(bucketId);
    const blob = bucket.file(`receipts/${uniqueName}`);
    await blob.save(file.buffer, { contentType: file.mimetype });
  }
  return `/api/receipts/${uniqueName}`;
}

function formatUser(user: any) {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    age: user.age,
    gender: user.gender,
    profileImageUrl: fixImageUrl(user.profileImageUrl),
    credits: user.credits,
    creditExpiryDate: user.creditExpiryDate,
    isAdmin: user.isAdmin,
    profileCompleted: user.profileCompleted,
    telegramId: user.telegramId,
    chatId: user.chatId,
    createdAt: user.createdAt,
  };
}

export function registerMobileRoutes(app: Express) {
  const router = express.Router();

  // ──────────────────────────────────────────────
  // GENERAL
  // ──────────────────────────────────────────────

  /**
   * GET /api/mobile/v1/time
   * Toshkent vaqtini qaytaradi
   */
  router.get('/time', (_req, res) => {
    const now = getTashkentNow();
    mobileSuccess(res, {
      date: getTashkentDateStr(now),
      time: getTashkentTimeStr(now),
      dayOfWeek: now.getDay(),
      timestamp: now.getTime(),
      timezone: 'Asia/Tashkent',
    });
  });

  /**
   * GET /api/mobile/v1/categories
   * Sport zal kategoriyalarini qaytaradi
   */
  router.get('/categories', async (_req, res) => {
    try {
      const { CATEGORIES } = await import('@shared/categories');
      mobileSuccess(res, { categories: CATEGORIES });
    } catch {
      mobileSuccess(res, { categories: [] });
    }
  });

  // ──────────────────────────────────────────────
  // AUTH
  // ──────────────────────────────────────────────

  /**
   * POST /api/mobile/v1/auth/sms/send
   * SMS OTP yuboradi
   * Body: { phone: string }
   */
  router.post('/auth/sms/send', async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) return mobileError(res, 'Telefon raqami talab qilinadi');

      const result = await sendSmsCode(phone);
      if (!result.success) {
        return mobileError(res, result.message, result.cooldown ? 429 : 400);
      }
      mobileSuccess(res, { message: result.message, phone: normalizePhone(phone) });
    } catch (err: any) {
      console.error('[Mobile] SMS send error:', err);
      mobileError(res, 'SMS yuborishda xatolik', 500);
    }
  });

  /**
   * POST /api/mobile/v1/auth/sms/verify
   * SMS OTP ni tekshiradi va JWT qaytaradi
   * Body: { phone: string, code: string }
   */
  router.post('/auth/sms/verify', async (req, res) => {
    try {
      const { phone, code } = req.body;
      if (!phone || !code) return mobileError(res, 'Telefon va kod talab qilinadi');

      const result = verifySmsCode(phone, code);
      if (!result.success) return mobileError(res, result.message);

      const normalized = `+${normalizePhone(phone)}`;
      let user = await storage.getUserByPhone(normalized);

      if (!user) {
        user = await storage.createUser({ phone: normalized });
      }

      const updatedUser = await storage.checkAndResetExpiredCredits(user.id);
      const finalUser = updatedUser || user;
      const tokens = generateTokenPair(finalUser.id);

      mobileSuccess(res, {
        ...tokens,
        user: formatUser(finalUser),
        isNewUser: !finalUser.profileCompleted,
      });
    } catch (err: any) {
      console.error('[Mobile] SMS verify error:', err);
      mobileError(res, 'Tasdiqlashda xatolik', 500);
    }
  });

  /**
   * POST /api/mobile/v1/auth/telegram/verify
   * Telegram bot orqali olingan kodni tekshiradi va JWT qaytaradi
   * Body: { code: string }
   */
  router.post('/auth/telegram/verify', async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) return mobileError(res, 'Kod talab qilinadi');

      const upperCode = (code as string).toUpperCase();
      const loginData = await storage.getLoginCodeByCode(upperCode);

      if (!loginData) return mobileError(res, "Kod noto'g'ri yoki muddati o'tgan");
      if (new Date() > new Date(loginData.expiresAt)) {
        await storage.deleteLoginCode(upperCode);
        return mobileError(res, "Kod muddati o'tgan. Botdan yangi kod oling");
      }
      if (loginData.attempts >= 3) {
        await storage.deleteLoginCode(upperCode);
        return mobileError(res, "Juda ko'p noto'g'ri urinish. Yangi kod oling");
      }

      await storage.incrementLoginCodeAttempts(upperCode);

      const user = await storage.getUserByTelegramId(loginData.telegramId);
      if (!user) return mobileError(res, 'Foydalanuvchi topilmadi', 404);

      await storage.deleteLoginCode(upperCode);

      const updatedUser = await storage.checkAndResetExpiredCredits(user.id);
      const finalUser = updatedUser || user;
      const tokens = generateTokenPair(finalUser.id);

      mobileSuccess(res, {
        ...tokens,
        user: formatUser(finalUser),
        isNewUser: !finalUser.profileCompleted,
      });
    } catch (err: any) {
      console.error('[Mobile] Telegram verify error:', err);
      mobileError(res, 'Tasdiqlashda xatolik', 500);
    }
  });

  /**
   * POST /api/mobile/v1/auth/complete-profile
   * Profil yakunlash (birinchi kirish)
   * Body: { name: string, age: number, gender: string }
   * Auth: Bearer token
   */
  router.post('/auth/complete-profile', requireMobileAuth, async (req, res) => {
    try {
      const mobileUser = (req as any).mobileUser;
      const { name, age, gender } = req.body;

      if (!name || !age || !gender) {
        return mobileError(res, "Ism, yosh va jins talab qilinadi");
      }
      if (typeof age !== 'number' || age < 10 || age > 100) {
        return mobileError(res, "Yosh 10 dan 100 gacha bo'lishi kerak");
      }
      if (!['Erkak', 'Ayol'].includes(gender)) {
        return mobileError(res, "Jins 'Erkak' yoki 'Ayol' bo'lishi kerak");
      }

      const updated = await storage.completeUserProfile(mobileUser.id, { name, age, gender });
      if (!updated) return mobileError(res, 'Foydalanuvchi topilmadi', 404);

      mobileSuccess(res, { user: formatUser(updated) });
    } catch (err: any) {
      console.error('[Mobile] Complete profile error:', err);
      mobileError(res, 'Profil yangilashda xatolik', 500);
    }
  });

  /**
   * POST /api/mobile/v1/auth/refresh
   * Access token yangilash
   * Body: { refreshToken: string }
   */
  router.post('/auth/refresh', async (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return mobileError(res, 'Refresh token talab qilinadi');

      const payload = verifyToken(refreshToken);
      if (!payload || payload.type !== 'refresh') {
        return mobileError(res, "Token yaroqsiz yoki muddati o'tgan", 401);
      }

      const user = await storage.getUser(payload.userId);
      if (!user) return mobileError(res, 'Foydalanuvchi topilmadi', 401);

      const accessToken = generateAccessToken(user.id);
      mobileSuccess(res, { accessToken, user: formatUser(user) });
    } catch (err: any) {
      console.error('[Mobile] Token refresh error:', err);
      mobileError(res, 'Token yangilashda xatolik', 500);
    }
  });

  // ──────────────────────────────────────────────
  // USER
  // ──────────────────────────────────────────────

  /**
   * GET /api/mobile/v1/user/me
   * Joriy foydalanuvchi ma'lumotlari
   * Auth: Bearer token
   */
  router.get('/user/me', requireMobileAuth, async (req, res) => {
    try {
      const mobileUser = (req as any).mobileUser;
      const user = await storage.checkAndResetExpiredCredits(mobileUser.id);
      mobileSuccess(res, { user: formatUser(user || mobileUser) });
    } catch (err: any) {
      mobileError(res, 'Foydalanuvchi ma\'lumotlarini olishda xatolik', 500);
    }
  });

  /**
   * PUT /api/mobile/v1/user/profile
   * Profil yangilash
   * Body: { name?: string, age?: number, gender?: string, profileImageUrl?: string }
   * Auth: Bearer token
   */
  router.put('/user/profile', requireMobileAuth, async (req, res) => {
    try {
      const mobileUser = (req as any).mobileUser;
      const { name, age, gender, profileImageUrl } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (age !== undefined) {
        if (typeof age !== 'number' || age < 10 || age > 100) {
          return mobileError(res, "Yosh 10 dan 100 gacha bo'lishi kerak");
        }
        updateData.age = age;
      }
      if (gender !== undefined) {
        if (!['Erkak', 'Ayol'].includes(gender)) {
          return mobileError(res, "Jins 'Erkak' yoki 'Ayol' bo'lishi kerak");
        }
        updateData.gender = gender;
      }
      if (profileImageUrl !== undefined) updateData.profileImageUrl = profileImageUrl;

      if (Object.keys(updateData).length === 0) {
        return mobileError(res, "Yangilanadigan maydon topilmadi");
      }

      const updated = await storage.updateUser(mobileUser.id, updateData);
      if (!updated) return mobileError(res, 'Foydalanuvchi topilmadi', 404);

      mobileSuccess(res, { user: formatUser(updated) });
    } catch (err: any) {
      mobileError(res, 'Profil yangilashda xatolik', 500);
    }
  });

  /**
   * POST /api/mobile/v1/user/avatar
   * Avatar rasm yuklash
   * Form-data: image (file)
   * Auth: Bearer token
   */
  router.post('/user/avatar', requireMobileAuth, avatarUpload.single('image'), async (req, res) => {
    try {
      const mobileUser = (req as any).mobileUser;
      if (!req.file) return mobileError(res, 'Rasm fayli talab qilinadi');
      if (!req.file.mimetype.startsWith('image/')) return mobileError(res, 'Faqat rasm fayllarini yuklash mumkin');

      const imageUrl = await uploadToObjectStorage(req.file, 'images');
      const updated = await storage.updateUser(mobileUser.id, { profileImageUrl: imageUrl });

      mobileSuccess(res, { imageUrl, user: formatUser(updated || mobileUser) });
    } catch (err: any) {
      console.error('[Mobile] Avatar upload error:', err);
      mobileError(res, 'Rasm yuklashda xatolik', 500);
    }
  });

  /**
   * GET /api/mobile/v1/user/stats
   * Foydalanuvchi statistikasi
   * Auth: Bearer token
   */
  router.get('/user/stats', requireMobileAuth, async (req, res) => {
    try {
      const mobileUser = (req as any).mobileUser;
      const [bookings, ratings, user] = await Promise.all([
        storage.getBookings(mobileUser.id),
        storage.getUserRatings(mobileUser.id),
        storage.checkAndResetExpiredCredits(mobileUser.id),
      ]);

      const completed = bookings.filter(b => b.status === 'completed' || b.isCompleted);
      const upcoming = bookings.filter(b => b.status === 'pending' && !b.isCompleted);
      const missed = bookings.filter(b => b.status === 'missed');
      const cancelled = bookings.filter(b => b.status === 'cancelled');

      const now = getTashkentNow();
      const creditExpiryDate = (user || mobileUser).creditExpiryDate;
      const daysUntilExpiry = creditExpiryDate
        ? Math.max(0, Math.ceil((new Date(creditExpiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : null;

      mobileSuccess(res, {
        credits: (user || mobileUser).credits,
        creditExpiryDate,
        daysUntilExpiry,
        totalBookings: bookings.length,
        completedVisits: completed.length,
        upcomingBookings: upcoming.length,
        missedBookings: missed.length,
        cancelledBookings: cancelled.length,
        ratingsGiven: ratings.length,
      });
    } catch (err: any) {
      mobileError(res, 'Statistika olishda xatolik', 500);
    }
  });

  // ──────────────────────────────────────────────
  // GYMS
  // ──────────────────────────────────────────────

  /**
   * GET /api/mobile/v1/gyms
   * Barcha sport zallarini qaytaradi (reytinglar bilan)
   * Query: ?category=string&search=string&lat=number&lng=number
   */
  router.get('/gyms', async (req, res) => {
    try {
      const { category, search, lat, lng } = req.query as Record<string, string>;
      const [gyms, avgRatings] = await Promise.all([
        storage.getGyms(),
        storage.getGymAverageRatings(),
      ]);
      const { CATEGORIES } = await import('@shared/categories');
      const catMap = new Map(CATEGORIES.map((c: any) => [c.id, c]));

      const ratingsMap = new Map(avgRatings.map(r => [r.gymId, r]));

      let result = gyms.map(gym => {
        const ratingInfo = ratingsMap.get(gym.id);
        let distanceKm: number | null = null;

        if (lat && lng && gym.latitude && gym.longitude) {
          const R = 6371;
          const dLat = ((parseFloat(gym.latitude) - parseFloat(lat)) * Math.PI) / 180;
          const dLng = ((parseFloat(gym.longitude) - parseFloat(lng)) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((parseFloat(lat) * Math.PI) / 180) *
            Math.cos((parseFloat(gym.latitude) * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
          distanceKm = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
        }

        const categoryObjects = (gym.categories || []).map((id: string) => catMap.get(id) || { id, name: id, icon: 'dumbbell' });

        return {
          ...fixGymImages(gym),
          categoryIds: gym.categories,
          categories: categoryObjects,
          avgRating: ratingInfo?.average ?? null,
          ratingCount: ratingInfo?.count ?? 0,
          distanceKm,
        };
      });

      if (category) {
        result = result.filter(g =>
          (g.categoryIds || []).some((c: string) => c.toLowerCase() === category.toLowerCase()) ||
          (g.categories || []).some((c: any) => (c.name || '').toLowerCase() === category.toLowerCase())
        );
      }
      if (search) {
        const q = search.toLowerCase();
        result = result.filter(g => g.name.toLowerCase().includes(q) || (g.address || '').toLowerCase().includes(q));
      }
      if (lat && lng) {
        result.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
      }

      mobileSuccess(res, { gyms: result, total: result.length });
    } catch (err: any) {
      mobileError(res, 'Sport zallarini olishda xatolik', 500);
    }
  });

  /**
   * GET /api/mobile/v1/gyms/:id
   * Bitta sport zal tafsiloti + vaqt slotlari + reytinglar
   */
  router.get('/gyms/:id', async (req, res) => {
    try {
      const [gym, allSlots, ratings] = await Promise.all([
        storage.getGym(req.params.id),
        storage.getTimeSlots(req.params.id),
        storage.getGymRatings(req.params.id),
      ]);

      if (!gym) return mobileError(res, 'Sport zal topilmadi', 404);

      const { CATEGORIES } = await import('@shared/categories');
      const catMap = new Map(CATEGORIES.map((c: any) => [c.id, c]));
      const categoryObjects = (gym.categories || []).map((id: string) => catMap.get(id) || { id, name: id, icon: 'dumbbell' });

      const avgRating = ratings.length
        ? Math.round((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) * 10) / 10
        : null;

      const DAY_NAMES = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
      const weeklySchedule = DAY_NAMES.map((dayName, dayNum) => {
        const isDayOff = (gym.closedDays || []).includes(String(dayNum));
        const daySlots = isDayOff ? [] : allSlots.filter((s: any) => s.dayOfWeek === dayName);
        return {
          dayNum,
          dayName,
          is_day_off: isDayOff,
          slots: daySlots.map((s: any) => ({ ...s, isAvailable: s.availableSpots > 0 })),
        };
      });

      mobileSuccess(res, {
        gym: {
          ...fixGymImages(gym),
          categoryIds: gym.categories,
          categories: categoryObjects,
          avgRating,
          ratingCount: ratings.length,
        },
        weeklySchedule,
        timeSlots: allSlots,
      });
    } catch (err: any) {
      mobileError(res, 'Sport zal ma\'lumotlarini olishda xatolik', 500);
    }
  });

  /**
   * GET /api/mobile/v1/gyms/:id/slots
   * Muayyan kun uchun mavjud vaqt slotlarini qaytaradi
   * Query: ?date=YYYY-MM-DD  (majburiy)
   */
  router.get('/gyms/:id/slots', async (req, res) => {
    try {
      const { date } = req.query as { date?: string };
      if (!date) return mobileError(res, "Sana talab qilinadi (?date=YYYY-MM-DD)");

      const gym = await storage.getGym(req.params.id);
      if (!gym) return mobileError(res, 'Sport zal topilmadi', 404);

      const dayNames = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
      const [y, m, d] = date.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayOfWeek = dayNames[dateObj.getDay()];
      const dayNum = dateObj.getDay();

      const isDayOff = (gym.closedDays || []).includes(String(dayNum));

      if (isDayOff) {
        return mobileSuccess(res, {
          date,
          dayOfWeek,
          dayNum,
          is_day_off: true,
          isClosed: true,
          slots: [],
          message: "Bu kun sport zal yopiq",
        });
      }

      const allSlots = await storage.getTimeSlots(req.params.id);
      const daySlots = allSlots.filter(s => s.dayOfWeek === dayOfWeek);

      mobileSuccess(res, {
        date,
        dayOfWeek,
        dayNum,
        is_day_off: false,
        isClosed: false,
        slots: daySlots.map(slot => ({
          ...slot,
          isAvailable: slot.availableSpots > 0,
        })),
      });
    } catch (err: any) {
      mobileError(res, 'Vaqt slotlarini olishda xatolik', 500);
    }
  });

  /**
   * POST /api/mobile/v1/gyms/:id/rate
   * Sport zalga baho berish
   * Body: { bookingId: string, rating: number (1-5) }
   * Auth: Bearer token
   */
  router.post('/gyms/:id/rate', requireMobileAuth, async (req, res) => {
    try {
      const mobileUser = (req as any).mobileUser;
      const gymId = req.params.id;
      const { bookingId, rating } = req.body;

      if (!bookingId || typeof rating !== 'number' || rating < 1 || rating > 5) {
        return mobileError(res, "bookingId va 1-5 oralig'idagi reyting talab qilinadi");
      }

      const gym = await storage.getGym(gymId);
      if (!gym) return mobileError(res, 'Sport zal topilmadi', 404);

      const booking = await storage.getBooking(bookingId);
      if (!booking) return mobileError(res, 'Bron topilmadi', 404);
      if (booking.userId !== mobileUser.id) return mobileError(res, 'Bu bron sizniki emas', 403);
      if (booking.gymId !== gymId) return mobileError(res, 'Bron ushbu zalga tegishli emas');
      if (!booking.isCompleted && booking.status !== 'completed') {
        return mobileError(res, 'Faqat yakunlangan bronlarga baho berish mumkin');
      }

      const existing = await storage.getGymRatingByBooking(bookingId);
      if (existing) return mobileError(res, 'Bu bron uchun baho allaqachon berilgan', 409);

      const gymRating = await storage.createGymRating({
        userId: mobileUser.id,
        gymId,
        bookingId,
        rating: Math.round(rating),
      });

      mobileSuccess(res, { gymRating });
    } catch (err: any) {
      mobileError(res, 'Baho berishda xatolik', 500);
    }
  });

  // ──────────────────────────────────────────────
  // BOOKINGS
  // ──────────────────────────────────────────────

  /**
   * GET /api/mobile/v1/bookings
   * Foydalanuvchi bronlari (missedlarni yangilaydi)
   * Query: ?status=pending|completed|missed|cancelled
   * Auth: Bearer token
   */
  router.get('/bookings', requireMobileAuth, async (req, res) => {
    try {
      const mobileUser = (req as any).mobileUser;
      const { status } = req.query as { status?: string };

      const bookings = await storage.getBookings(mobileUser.id);
      const todayStr = getTashkentDateStr();
      const currentTime = getTashkentTimeStr();

      for (const booking of bookings) {
        if (!booking.isCompleted && booking.status !== 'missed' && booking.status !== 'completed' && booking.status !== 'cancelled') {
          if (booking.date) {
            const bookingDateStr = typeof booking.date === 'string'
              ? booking.date.split('T')[0]
              : new Date(booking.date as any).toISOString().split('T')[0];

            if (bookingDateStr < todayStr) {
              await storage.updateBookingStatus(booking.id, 'missed');
              (booking as any).status = 'missed';
            } else if (bookingDateStr === todayStr && booking.scheduledEndTime) {
              const [endH, endM] = booking.scheduledEndTime.split(':').map(Number);
              const endWithGrace = `${String(endH + 1).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
              if (currentTime >= endWithGrace) {
                await storage.updateBookingStatus(booking.id, 'missed');
                (booking as any).status = 'missed';
              }
            }
          }
        }
      }

      const filtered = status ? bookings.filter(b => b.status === status) : bookings;
      const sorted = filtered.sort((a, b) => {
        const dateA = a.date ? new Date(a.date as any).getTime() : 0;
        const dateB = b.date ? new Date(b.date as any).getTime() : 0;
        return dateB - dateA;
      });

      mobileSuccess(res, { bookings: sorted, total: sorted.length });
    } catch (err: any) {
      mobileError(res, 'Bronlarni olishda xatolik', 500);
    }
  });

  /**
   * POST /api/mobile/v1/bookings
   * Zal bronlash
   * Body: { gymId, timeSlotId, date } (date: YYYY-MM-DD)
   * Auth: Bearer token
   */
  router.post('/bookings', requireMobileAuth, async (req, res) => {
    try {
      const mobileUser = (req as any).mobileUser;
      const { gymId, timeSlotId, date } = req.body;

      if (!gymId || !timeSlotId || !date) {
        return mobileError(res, 'gymId, timeSlotId va date talab qilinadi');
      }

      const user = await storage.checkAndResetExpiredCredits(mobileUser.id);
      const currentUser = user || mobileUser;

      const gym = await storage.getGym(gymId);
      if (!gym) return mobileError(res, 'Sport zal topilmadi', 404);

      const dayNum = new Date(date).getDay();
      if ((gym.closedDays || []).includes(String(dayNum))) {
        return mobileError(res, 'Bu kun sport zal yopiq');
      }

      const timeSlot = await storage.getTimeSlot(timeSlotId);
      if (!timeSlot) return mobileError(res, 'Vaqt sloti topilmadi', 404);
      if (timeSlot.gymId !== gymId) return mobileError(res, 'Vaqt sloti bu zalga tegishli emas');
      if (timeSlot.availableSpots <= 0) return mobileError(res, "Bu vaqt slotida joy qolmagan");

      if (currentUser.credits < gym.credits) {
        return mobileError(res, `Kredit yetarli emas. Kerak: ${gym.credits}, mavjud: ${currentUser.credits}`);
      }

      const existingBookings = await storage.getBookings(mobileUser.id);
      const hasConflict = existingBookings.some(b =>
        b.gymId === gymId &&
        b.date === date &&
        (b.status === 'pending') &&
        !b.isCompleted
      );
      if (hasConflict) {
        return mobileError(res, "Bu zal uchun shu kunda allaqachon bron qilgansiz");
      }

      const qrData = JSON.stringify({
        type: 'booking',
        userId: mobileUser.id,
        gymId,
        date,
        time: timeSlot.startTime,
        timestamp: Date.now(),
      });

      const booking = await storage.createBooking({
        userId: mobileUser.id,
        gymId,
        date,
        time: timeSlot.startTime,
        qrCode: qrData,
        timeSlotId,
        scheduledStartTime: timeSlot.startTime,
        scheduledEndTime: timeSlot.endTime,
        status: 'pending',
      });

      await storage.updateUserCredits(mobileUser.id, currentUser.credits - gym.credits);
      await storage.updateTimeSlot(timeSlotId, {
        availableSpots: Math.max(0, timeSlot.availableSpots - 1),
      });

      mobileSuccess(res, {
        booking,
        creditsUsed: gym.credits,
        remainingCredits: currentUser.credits - gym.credits,
      }, 201);
    } catch (err: any) {
      console.error('[Mobile] Book gym error:', err);
      mobileError(res, 'Bron qilishda xatolik', 500);
    }
  });

  /**
   * GET /api/mobile/v1/bookings/:id
   * Bitta bron tafsiloti
   * Auth: Bearer token
   */
  router.get('/bookings/:id', requireMobileAuth, async (req, res) => {
    try {
      const mobileUser = (req as any).mobileUser;
      const booking = await storage.getBooking(req.params.id);
      if (!booking) return mobileError(res, 'Bron topilmadi', 404);
      if (booking.userId !== mobileUser.id) return mobileError(res, 'Ruxsat yo\'q', 403);

      const [gym, ratingInfo] = await Promise.all([
        storage.getGym(booking.gymId),
        storage.getGymRatingByBooking(booking.id),
      ]);

      mobileSuccess(res, { booking, gym, hasRated: !!ratingInfo });
    } catch (err: any) {
      mobileError(res, 'Bron ma\'lumotlarini olishda xatolik', 500);
    }
  });

  /**
   * DELETE /api/mobile/v1/bookings/:id
   * Bronni bekor qilish (2 soatdan oldin — kredit qaytariladi)
   * Auth: Bearer token
   */
  router.delete('/bookings/:id', requireMobileAuth, async (req, res) => {
    try {
      const mobileUser = (req as any).mobileUser;
      const booking = await storage.getBooking(req.params.id);

      if (!booking) return mobileError(res, 'Bron topilmadi', 404);
      if (booking.userId !== mobileUser.id) return mobileError(res, 'Ruxsat yo\'q', 403);
      if (booking.status === 'completed' || booking.isCompleted) {
        return mobileError(res, 'Yakunlangan bronni bekor qilib bo\'lmaydi');
      }
      if (booking.status === 'cancelled') {
        return mobileError(res, 'Bu bron allaqachon bekor qilingan');
      }

      const gym = await storage.getGym(booking.gymId);
      const user = await storage.getUser(mobileUser.id);
      if (!user || !gym) return mobileError(res, 'Ma\'lumot topilmadi', 404);

      let refunded = false;
      if (booking.scheduledStartTime && booking.date) {
        const [slotH, slotM] = booking.scheduledStartTime.split(':').map(Number);
        const datePart = (booking.date as string).split('T')[0];
        const [year, month, day] = datePart.split('-').map(Number);
        if (year && month && day && !isNaN(slotH) && !isNaN(slotM)) {
          const slotUTC = Date.UTC(year, month - 1, day, slotH - 5, slotM);
          const diffHours = (slotUTC - Date.now()) / 3600000;
          if (diffHours >= 2) {
            await storage.updateUserCredits(mobileUser.id, user.credits + gym.credits);
            refunded = true;
          }
        }
      }

      if (booking.timeSlotId) {
        const timeSlot = await storage.getTimeSlot(booking.timeSlotId);
        if (timeSlot) {
          await storage.updateTimeSlot(booking.timeSlotId, {
            availableSpots: Math.min(timeSlot.availableSpots + 1, timeSlot.capacity),
          });
        }
      }

      await storage.updateBookingStatus(booking.id, 'cancelled');

      mobileSuccess(res, {
        message: refunded
          ? `Bron bekor qilindi. ${gym.credits} kredit qaytarildi.`
          : "Bron bekor qilindi. Boshlanishiga 2 soatdan kam qolganligi sababli kredit qaytarilmadi.",
        refunded,
        creditsRefunded: refunded ? gym.credits : 0,
      });
    } catch (err: any) {
      mobileError(res, 'Bronni bekor qilishda xatolik', 500);
    }
  });

  /**
   * POST /api/mobile/v1/bookings/verify-qr
   * QR kod orqali zal kirishini tasdiqlash
   * Body: { qrData: string }
   * Auth: Bearer token
   */
  router.post('/bookings/verify-qr', requireMobileAuth, async (req, res) => {
    try {
      const mobileUser = (req as any).mobileUser;
      const { qrData } = req.body;
      if (!qrData) return mobileError(res, 'QR kod ma\'lumoti talab qilinadi');

      let parsedQR: any;
      try {
        parsedQR = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
      } catch {
        return mobileError(res, "QR kod formati noto'g'ri");
      }

      const gymId = parsedQR.gymId;
      if (!gymId) return mobileError(res, "QR kod zal identifikatorini o'z ichiga olmagan");

      const gym = await storage.getGym(gymId);
      if (!gym) return mobileError(res, 'Sport zal topilmadi', 404);

      const bookings = await storage.getBookings(mobileUser.id);
      const todayStr = getTashkentDateStr();

      const activeBooking = bookings.find(b => {
        const bookingDate = typeof b.date === 'string' ? b.date.split('T')[0] : '';
        return b.gymId === gymId && bookingDate === todayStr && !b.isCompleted && b.status === 'pending';
      });

      if (!activeBooking) {
        return mobileError(res, "Bugun bu zalda faol broningiz yo'q");
      }

      const currentTime = getTashkentTimeStr();
      if (activeBooking.scheduledStartTime) {
        const [startH, startM] = activeBooking.scheduledStartTime.split(':').map(Number);
        const earlyLimit = `${String(startH - 1).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
        if (currentTime < earlyLimit) {
          return mobileError(res, `Siz juda erta keldingiz. Kirish ${earlyLimit} dan boshlanadi`);
        }
      }

      await storage.completeBooking(activeBooking.id);

      const user = await storage.getUser(mobileUser.id);
      const creditsEarned = gym.credits;
      const pricePerVisit = Math.round(gym.credits * 1500);

      await storage.createGymVisit({
        gymId,
        visitorName: user?.name || 'Noma\'lum',
        visitorProfileImage: user?.profileImageUrl || null,
        creditsUsed: creditsEarned,
        amountEarned: pricePerVisit,
      });

      await storage.updateGymEarnings(gymId, pricePerVisit);

      mobileSuccess(res, {
        message: `${gym.name} ga xush kelibsiz!`,
        gym: { id: gym.id, name: gym.name, imageUrl: gym.imageUrl },
        booking: { ...activeBooking, isCompleted: true, status: 'completed' },
        visitRecorded: true,
      });
    } catch (err: any) {
      console.error('[Mobile] QR verify error:', err);
      mobileError(res, 'QR tekshirishda xatolik', 500);
    }
  });

  // ──────────────────────────────────────────────
  // CREDITS
  // ──────────────────────────────────────────────

  /**
   * GET /api/mobile/v1/credits
   * Kredit holati
   * Auth: Bearer token
   */
  router.get('/credits', requireMobileAuth, async (req, res) => {
    try {
      const mobileUser = (req as any).mobileUser;
      const user = await storage.checkAndResetExpiredCredits(mobileUser.id);
      const currentUser = user || mobileUser;

      const [pendingPayment, pendingPayments] = await Promise.all([
        storage.getActiveCreditPayment(mobileUser.id),
        storage.getPendingCreditPayments(mobileUser.id),
      ]);

      const now = getTashkentNow();
      const expiryDate = currentUser.creditExpiryDate;
      const daysUntilExpiry = expiryDate
        ? Math.max(0, Math.ceil((new Date(expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : null;

      mobileSuccess(res, {
        credits: currentUser.credits,
        creditExpiryDate: expiryDate,
        daysUntilExpiry,
        isExpired: expiryDate ? new Date(expiryDate) < now : false,
        packages: ALLOWED_CREDIT_PACKAGES.map(c => ({
          credits: c,
          price: CREDIT_PRICES[c],
          priceFormatted: `${CREDIT_PRICES[c].toLocaleString()} so'm`,
        })),
        activePartialPayment: pendingPayment?.status === 'partial' ? pendingPayment : null,
        pendingPaymentsCount: pendingPayments.length,
      });
    } catch (err: any) {
      mobileError(res, 'Kredit ma\'lumotlarini olishda xatolik', 500);
    }
  });

  /**
   * POST /api/mobile/v1/credits/purchase
   * To'lov chekini yuborish (admin tasdiqlaydi)
   * Form-data: receipt (image), credits (number), price (number)
   * Auth: Bearer token
   */
  router.post('/credits/purchase', requireMobileAuth, upload.single('receipt'), async (req, res) => {
    try {
      const mobileUser = (req as any).mobileUser;
      const { credits, price } = req.body;
      const creditsNum = parseInt(credits);
      const priceNum = price ? parseInt(price) : CREDIT_PRICES[creditsNum];

      if (!creditsNum || !ALLOWED_CREDIT_PACKAGES.includes(creditsNum)) {
        return mobileError(res, `Noto'g'ri kredit paketi. Ruxsat etilganlar: ${ALLOWED_CREDIT_PACKAGES.join(', ')}`);
      }
      if (!req.file) return mobileError(res, 'To\'lov cheki rasmi talab qilinadi');

      const receiptUrl = await saveReceiptFile(req.file);
      const payment = await storage.createCreditPayment({
        userId: mobileUser.id,
        credits: creditsNum,
        price: priceNum || CREDIT_PRICES[creditsNum],
        status: 'pending',
        remainingAmount: priceNum || CREDIT_PRICES[creditsNum],
      });

      await storage.updateCreditPayment(payment.id, { receiptUrl } as any);

      const user = await storage.getUser(mobileUser.id);
      const fullReceiptUrl = `${getAppUrl()}${receiptUrl}`;
      await sendPaymentReceiptToAdmin(storage, payment.id, fullReceiptUrl, user, creditsNum, priceNum || CREDIT_PRICES[creditsNum]);

      mobileSuccess(res, {
        message: "Chek yuborildi. Admin tasdiqlashini kuting.",
        paymentId: payment.id,
        credits: creditsNum,
        price: priceNum || CREDIT_PRICES[creditsNum],
      }, 201);
    } catch (err: any) {
      console.error('[Mobile] Credit purchase error:', err);
      mobileError(res, 'Chek yuborishda xatolik', 500);
    }
  });

  /**
   * POST /api/mobile/v1/credits/purchase/:id/remaining
   * Qoldiq to'lovni yuborish
   * Form-data: receipt (image)
   * Auth: Bearer token
   */
  router.post('/credits/purchase/:id/remaining', requireMobileAuth, upload.single('receipt'), async (req, res) => {
    try {
      const mobileUser = (req as any).mobileUser;
      const payment = await storage.getCreditPayment(req.params.id);

      if (!payment || payment.userId !== mobileUser.id) return mobileError(res, 'To\'lov topilmadi', 404);
      if (payment.status !== 'partial') return mobileError(res, 'Bu to\'lov uchun qoldiq yo\'q');
      if (!req.file) return mobileError(res, 'Chek rasmi talab qilinadi');

      const receiptUrl = await saveReceiptFile(req.file);
      await storage.updateCreditPayment(payment.id, { receiptUrl } as any);

      const user = await storage.getUser(mobileUser.id);
      const fullReceiptUrl = `${getAppUrl()}${receiptUrl}`;
      await sendPaymentReceiptToAdmin(storage, payment.id, fullReceiptUrl, user, payment.credits, payment.remainingAmount, true);

      mobileSuccess(res, {
        message: "Qoldiq chek yuborildi. Admin tasdiqlashini kuting.",
        remainingAmount: payment.remainingAmount,
      });
    } catch (err: any) {
      mobileError(res, 'Qoldiq chek yuborishda xatolik', 500);
    }
  });

  /**
   * GET /api/mobile/v1/credits/payment/:id/status
   * To'lov holati va yangilangan balans
   * Auth: Bearer token
   */
  router.get('/credits/payment/:id/status', requireMobileAuth, async (req, res) => {
    try {
      const mobileUser = (req as any).mobileUser;
      const payment = await storage.getCreditPayment(req.params.id);
      if (!payment || payment.userId !== mobileUser.id) return mobileError(res, 'To\'lov topilmadi', 404);
      const currentUser = await storage.getUser(mobileUser.id);
      mobileSuccess(res, {
        paymentId: payment.id,
        status: payment.status,
        credits: payment.credits,
        price: payment.price,
        remainingAmount: payment.remainingAmount,
        currentBalance: currentUser?.credits ?? 0,
        creditExpiryDate: currentUser?.creditExpiryDate ?? null,
      });
    } catch (err: any) {
      mobileError(res, 'To\'lov holatini olishda xatolik', 500);
    }
  });

  // ──────────────────────────────────────────────
  // COLLECTIONS (KURSLAR)
  // ──────────────────────────────────────────────

  /**
   * GET /api/mobile/v1/collections
   * Video kurslar ro'yxati (sotib olish holati bilan)
   * Query: ?category=string
   * Auth: Bearer token (ixtiyoriy)
   */
  router.get('/collections', async (req, res) => {
    try {
      const authHeader = req.headers['authorization'];
      let userId: string | null = null;
      if (authHeader?.startsWith('Bearer ')) {
        const payload = verifyToken(authHeader.slice(7));
        if (payload?.type === 'access') userId = payload.userId;
      }

      const { category } = req.query as { category?: string };
      const collections = await storage.getVideoCollections();

      const collectionsWithStatus = await Promise.all(
        collections.map(async c => {
          const purchased = userId ? await storage.hasPurchased(userId, c.id) : false;
          const classes = await storage.getClasses(c.id);
          return {
            ...c,
            isPurchased: purchased || c.isFree,
            classCount: classes.length,
          };
        })
      );

      const filtered = category
        ? collectionsWithStatus.filter(c => c.categories.some(cat => cat.toLowerCase() === category.toLowerCase()))
        : collectionsWithStatus;

      mobileSuccess(res, { collections: filtered, total: filtered.length });
    } catch (err: any) {
      mobileError(res, 'Kurslarni olishda xatolik', 500);
    }
  });

  /**
   * GET /api/mobile/v1/collections/:id
   * Kurs tafsiloti + videolar ro'yxati
   * Auth: Bearer token (ixtiyoriy)
   */
  router.get('/collections/:id', async (req, res) => {
    try {
      const authHeader = req.headers['authorization'];
      let userId: string | null = null;
      if (authHeader?.startsWith('Bearer ')) {
        const payload = verifyToken(authHeader.slice(7));
        if (payload?.type === 'access') userId = payload.userId;
      }

      const [collection, classes] = await Promise.all([
        storage.getVideoCollection(req.params.id),
        storage.getClasses(req.params.id),
      ]);

      if (!collection) return mobileError(res, 'Kurs topilmadi', 404);

      const purchased = userId ? await storage.hasPurchased(userId, collection.id) : false;
      const hasAccess = purchased || collection.isFree;

      const sortedClasses = classes.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

      mobileSuccess(res, {
        collection: { ...collection, isPurchased: hasAccess, classCount: classes.length },
        classes: sortedClasses.map(c => ({
          ...c,
          videoUrl: hasAccess ? c.videoUrl : null,
          isLocked: !hasAccess,
        })),
        hasAccess,
      });
    } catch (err: any) {
      mobileError(res, 'Kurs ma\'lumotlarini olishda xatolik', 500);
    }
  });

  /**
   * POST /api/mobile/v1/collections/:id/purchase
   * Kursni kredit bilan sotib olish
   * Auth: Bearer token
   */
  router.post('/collections/:id/purchase', requireMobileAuth, async (req, res) => {
    try {
      const mobileUser = (req as any).mobileUser;
      const collection = await storage.getVideoCollection(req.params.id);
      if (!collection) return mobileError(res, 'Kurs topilmadi', 404);
      if (collection.isFree) return mobileError(res, 'Bu kurs bepul, sotib olish shart emas');

      const alreadyPurchased = await storage.hasPurchased(mobileUser.id, collection.id);
      if (alreadyPurchased) return mobileError(res, 'Bu kursni allaqachon sotib olgansiz', 409);

      const user = await storage.checkAndResetExpiredCredits(mobileUser.id);
      const currentUser = user || mobileUser;

      if (currentUser.credits < collection.price) {
        return mobileError(res, `Kredit yetarli emas. Kerak: ${collection.price}, mavjud: ${currentUser.credits}`);
      }

      await storage.updateUserCredits(mobileUser.id, currentUser.credits - collection.price);
      await storage.createUserPurchase({ userId: mobileUser.id, collectionId: collection.id });

      mobileSuccess(res, {
        message: `"${collection.name}" kursi muvaffaqiyatli sotib olindi!`,
        creditsUsed: collection.price,
        remainingCredits: currentUser.credits - collection.price,
      }, 201);
    } catch (err: any) {
      mobileError(res, 'Kurs sotib olishda xatolik', 500);
    }
  });

  // ──────────────────────────────────────────────
  // CLASSES (VIDEOLAR)
  // ──────────────────────────────────────────────

  /**
   * GET /api/mobile/v1/classes/:id
   * Video dars tafsiloti (kirish huquqi tekshiriladi)
   * Auth: Bearer token
   */
  router.get('/classes/:id', requireMobileAuth, async (req, res) => {
    try {
      const mobileUser = (req as any).mobileUser;
      const cls = await storage.getClass(req.params.id);
      if (!cls) return mobileError(res, 'Video dars topilmadi', 404);

      const collection = await storage.getVideoCollection(cls.collectionId);
      if (!collection) return mobileError(res, 'Kurs topilmadi', 404);

      const hasAccess = collection.isFree || mobileUser.isAdmin || await storage.hasPurchased(mobileUser.id, collection.id);
      if (!hasAccess) {
        return mobileError(res, "Bu videoga kirish uchun avval kursni sotib oling", 403);
      }

      mobileSuccess(res, {
        class: cls,
        collection: { id: collection.id, name: collection.name, isFree: collection.isFree },
      });
    } catch (err: any) {
      mobileError(res, 'Video dars ma\'lumotlarini olishda xatolik', 500);
    }
  });

  // ──────────────────────────────────────────────
  // PARTNERSHIP
  // ──────────────────────────────────────────────

  /**
   * POST /api/mobile/v1/partnership
   * Hamkorlik so'rovi yuborish
   * Body: { hallName: string, phone: string }
   */
  router.post('/partnership', async (req, res) => {
    try {
      const { hallName, phone } = req.body;
      if (!hallName || !phone) return mobileError(res, "Zal nomi va telefon talab qilinadi");

      const message = await storage.createPartnershipMessage({ hallName, phone });
      mobileSuccess(res, {
        message: "Hamkorlik so'rovingiz qabul qilindi. Tez orada bog'lanamiz!",
        id: message.id,
      }, 201);
    } catch (err: any) {
      mobileError(res, 'So\'rov yuborishda xatolik', 500);
    }
  });

  app.use('/api/mobile/v1', router);
}
