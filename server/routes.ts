import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGymSchema, insertUserSchema, insertOnlineClassSchema, insertBookingSchema, insertVideoCollectionSchema, insertUserPurchaseSchema, insertTimeSlotSchema, completeProfileSchema } from "@shared/schema";
import passport from "passport";
import { requireAuth, requireAdmin } from "./auth";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import Stripe from "stripe";
import { setupTelegramBot, sendPaymentReceiptToAdmin, getAppUrl, syncAdminFlag } from "./telegram";
import { Client as ObjectStorageClient } from "@replit/object-storage";
import { sendSmsCode, verifySmsCode, normalizePhone } from "./sms";
import { registerMobileRoutes } from "./mobileRoutes";
import { rateLimit, publicGym, pickFields, GYM_ADMIN_EDITABLE_FIELDS, GYM_OWNER_EDITABLE_FIELDS } from "./security";
import { createGymQr, isAuthenticGymQr } from "./qrSignature";

let _osClientPromise: Promise<ObjectStorageClient | null> | null = null;
function getOsClient(): Promise<ObjectStorageClient | null> {
  if (!_osClientPromise) {
    _osClientPromise = (async () => {
      try {
        const client = new ObjectStorageClient();
        const stateP = (client as any).state?.promise;
        if (stateP) await stateP;
        console.log('[Storage] Object Storage tayyor');
        return client;
      } catch (e: any) {
        console.warn('[Storage] Object Storage mavjud emas:', e.message);
        return null;
      }
    })();
  }
  return _osClientPromise;
}

export function registerHealthCheck(app: Express) {
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  app.post('/api/health', (_req, res) => {
    res.json({ status: 'ok', method: 'POST', timestamp: new Date().toISOString() });
  });
}

function getTashkentNow(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 5 * 3600000);
}

function getTashkentDateStr(): string {
  const tashkent = getTashkentNow();
  const y = tashkent.getFullYear();
  const m = String(tashkent.getMonth() + 1).padStart(2, '0');
  const d = String(tashkent.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTashkentTimeStr(): string {
  const tashkent = getTashkentNow();
  return `${String(tashkent.getHours()).padStart(2, '0')}:${String(tashkent.getMinutes()).padStart(2, '0')}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Stripe sozlamalari
  let stripe: Stripe | null = null;
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  const uploadsDir = path.join(process.cwd(), 'uploads');
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.mkdir(path.join(uploadsDir, 'receipts'), { recursive: true });
  } catch (error) {
    console.error("Uploads papkasini yaratishda xatolik:", error);
  }
  app.use('/uploads', express.static(uploadsDir));

  async function saveReceiptFile(file: Express.Multer.File, uniqueName: string): Promise<string> {
    try {
      await storage.saveFile(`receipts/${uniqueName}`, file.buffer, file.mimetype);
      console.log(`[Receipt] DB ga saqlandi: receipts/${uniqueName}`);
    } catch (err: any) {
      console.error(`[Receipt] DB xatoligi:`, err.message);
      const localDir = path.join(uploadsDir, 'receipts');
      await fs.mkdir(localDir, { recursive: true });
      await fs.writeFile(path.join(localDir, uniqueName), file.buffer);
      console.log(`[Receipt] Lokal diskka saqlandi: receipts/${uniqueName}`);
    }
    return `/api/receipts/${uniqueName}`;
  }

  app.get('/api/tashkent-time', (req, res) => {
    const now = getTashkentNow();
    res.json({
      date: getTashkentDateStr(),
      time: getTashkentTimeStr(),
      dayOfWeek: now.getDay(),
      timestamp: now.getTime(),
    });
  });

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Faqat rasm fayllarini yuklash mumkin'));
      }
    }
  });

  async function uploadToObjectStorage(file: Express.Multer.File): Promise<string> {
    const ext = path.extname(file.originalname) ||
      (file.mimetype === 'image/png' ? '.png' :
       file.mimetype === 'image/gif' ? '.gif' :
       file.mimetype === 'image/webp' ? '.webp' : '.jpg');
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;

    try {
      await storage.saveFile(`images/${uniqueName}`, file.buffer, file.mimetype);
      console.log(`[Upload] DB ga saqlandi: images/${uniqueName}`);
    } catch (err: any) {
      console.error(`[Upload] DB xatoligi:`, err.message);
      const imagesDir = path.join(uploadsDir, 'images');
      await fs.mkdir(imagesDir, { recursive: true });
      await fs.writeFile(path.join(imagesDir, uniqueName), file.buffer);
      console.log(`[Upload] Lokal diskka saqlandi: ${uniqueName}`);
    }
    return `/api/images/${uniqueName}`;
  }

  app.post("/api/upload-images", requireAuth, upload.array('images', 10), async (req, res) => {
    try {
      if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
        return res.status(400).json({ error: "Fayllar topilmadi" });
      }

      const files = req.files as Express.Multer.File[];
      const imageUrls = await Promise.all(files.map(f => uploadToObjectStorage(f)));

      res.json({ imageUrls });
    } catch (error: any) {
      console.error("Rasm yuklash xatosi:", error);
      res.status(500).json({ error: "Rasm yuklashda xatolik yuz berdi" });
    }
  });

  app.post("/api/upload-image", requireAuth, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Fayl topilmadi" });
      }

      const imageUrl = await uploadToObjectStorage(req.file);
      res.json({ imageUrl });
    } catch (error: any) {
      console.error("Rasm yuklash xatosi:", error);
      res.status(500).json({ error: "Rasm yuklashda xatolik yuz berdi" });
    }
  });

  app.get("/api/images/:filename", async (req, res) => {
    try {
      const filename = req.params.filename;

      const dbFile = await storage.getFile(`images/${filename}`);
      if (dbFile) {
        res.setHeader('Content-Type', dbFile.contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(dbFile.data);
      }

      const localPath = path.join(uploadsDir, 'images', filename);
      try {
        await fs.access(localPath);
        let contentType = 'image/jpeg';
        if (filename.endsWith('.png')) contentType = 'image/png';
        else if (filename.endsWith('.gif')) contentType = 'image/gif';
        else if (filename.endsWith('.webp')) contentType = 'image/webp';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.sendFile(localPath);
      } catch {
        return res.status(404).json({ error: "Rasm topilmadi" });
      }
    } catch (error: any) {
      console.error("Rasm yuklab olish xatosi:", error);
      res.status(404).json({ error: "Rasm topilmadi" });
    }
  });

  // Cheklar shaxsiy moliyaviy ma'lumot — faqat admin ko'ra oladi.
  // Telegram'ga cheklar Buffer sifatida yuboriladi (URL orqali emas), shuning
  // uchun bu endpointni yopish bot ishiga ta'sir qilmaydi.
  app.get("/api/receipts/:filename", requireAuth, requireAdmin, async (req, res) => {
    try {
      const filename = req.params.filename;

      const dbFile = await storage.getFile(`receipts/${filename}`);
      if (dbFile) {
        res.setHeader('Content-Type', dbFile.contentType);
        return res.send(dbFile.data);
      }

      const localPath = path.join(uploadsDir, 'receipts', filename);
      try {
        await fs.access(localPath);
        return res.sendFile(localPath);
      } catch {
        return res.status(404).json({ error: "Chek topilmadi" });
      }
    } catch (error: any) {
      console.error("Chek yuklab olish xatosi:", error);
      res.status(404).json({ error: "Chek topilmadi" });
    }
  });

  // Eslatma: /api/register va /api/login endpointlari olib tashlandi.
  // Ular faqat telefon raqamini talab qilardi va raqam bazada mavjud bo'lsa
  // hech qanday tasdiqlashsiz o'sha akkauntga kirgizardi (akkaunt o'g'irlash).
  // Ro'yxatdan o'tish va kirish faqat Telegram kodi yoki SMS OTP orqali:
  //   POST /api/telegram/verify-code, POST /api/sms/send + /api/sms/verify

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Chiqishda xatolik" });
      }
      res.json({ message: "Muvaffaqiyatli chiqildi" });
    });
  });

  // Mobil ilova JWT tokeni bilan web session ochish
  app.post("/api/auth/token-login", rateLimit('token-login', {
    windowMs: 15 * 60 * 1000,
    max: 20,
  }), async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ message: "Token talab qilinadi" });

      const { verifyToken } = await import("./mobileAuth");
      const payload = verifyToken(token);
      if (!payload || payload.type !== "access") {
        return res.status(401).json({ message: "Token yaroqsiz yoki muddati o'tgan" });
      }

      const user = await storage.getUser(payload.userId);
      if (!user) return res.status(401).json({ message: "Foydalanuvchi topilmadi" });

      req.logIn({
        id: user.id,
        phone: user.phone || undefined,
        telegramId: user.telegramId || undefined,
        name: user.name || undefined,
        credits: user.credits,
        isAdmin: user.isAdmin,
        profileCompleted: user.profileCompleted,
      }, (err) => {
        if (err) return res.status(500).json({ message: "Session yaratishda xatolik" });
        return res.json({ user });
      });
    } catch (err) {
      return res.status(500).json({ message: "Xatolik yuz berdi" });
    }
  });

  app.get("/api/user", async (req, res) => {
    if (req.isAuthenticated()) {
      // Kredit muddatini tekshirish va agar muddati o'tgan bo'lsa nolga tushirish
      const fullUser = await storage.checkAndResetExpiredCredits(req.user!.id);
      if (fullUser) {
        return res.json({ user: fullUser });
      }
      return res.json({ user: req.user });
    }
    res.status(401).json({ message: "Tizimga kirilmagan" });
  });

  // Gym routes
  app.get("/api/gyms", async (req, res) => {
    try {
      const [gyms, avgRatings] = await Promise.all([
        storage.getGyms(),
        storage.getGymAverageRatings(),
      ]);
      const ratingsMap = new Map(avgRatings.map(r => [r.gymId, r]));
      // publicGym() qrCode va ownerAccessCode ni olib tashlaydi — ilgari bu
      // ikkisi ham ommaviy javobda ketardi, ya'ni har kim zal egasi panelining
      // kirish kodini va kirish QR kodini o'qiy olardi.
      const gymsWithRatings = gyms.map(gym => ({
        ...publicGym(gym),
        avgRating: ratingsMap.get(gym.id)?.average ?? null,
        ratingCount: ratingsMap.get(gym.id)?.count ?? 0,
      }));
      res.json({ gyms: gymsWithRatings });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch gyms" });
    }
  });

  app.post("/api/resolve-maps-url", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      const extractCoordinates = (fullUrl: string) => {
        const patterns = [
          /@(-?\d+\.\d+),(-?\d+\.\d+)/,
          /ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
          /q=(-?\d+\.\d+),(-?\d+\.\d+)/,
          /place\/[^/]+\/@(-?\d+\.\d+),(-?\d+\.\d+)/,
          /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
        ];
        for (const pattern of patterns) {
          const match = fullUrl.match(pattern);
          if (match) {
            return { latitude: match[1], longitude: match[2] };
          }
        }
        return null;
      };

      let coords = extractCoordinates(url);
      if (coords) {
        return res.json(coords);
      }

      const allowedDomains = ["maps.app.goo.gl", "goo.gl", "google.com", "maps.google.com", "www.google.com"];
      let urlHost = "";
      try { urlHost = new URL(url).hostname; } catch {}
      if (!allowedDomains.some(d => urlHost === d || urlHost.endsWith("." + d))) {
        return res.status(400).json({ error: "Faqat Google Maps havolalari qo'llab-quvvatlanadi" });
      }

      if (url.includes("maps.app.goo.gl") || url.includes("goo.gl")) {
        try {
          const response = await fetch(url, { redirect: "follow" });
          const resolvedUrl = response.url;
          coords = extractCoordinates(resolvedUrl);
          if (coords) {
            return res.json(coords);
          }

          const html = await response.text();
          const htmlCoordMatch = html.match(/center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/) ||
                                  html.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
                                  html.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
          if (htmlCoordMatch) {
            return res.json({ latitude: htmlCoordMatch[1], longitude: htmlCoordMatch[2] });
          }
        } catch (fetchError) {
          console.error("Error resolving maps URL:", fetchError);
        }
      }

      res.status(404).json({ error: "Koordinatalar topilmadi. To'liq Google Maps havolasini kiriting." });
    } catch (error: any) {
      console.error("Error resolving maps URL:", error);
      res.status(500).json({ error: "URL ochishda xatolik" });
    }
  });

  app.post("/api/fix-gym-coordinates", requireAuth, requireAdmin, async (req, res) => {
    try {
      const gyms = await storage.getGyms();
      const results: any[] = [];

      const extractCoords = (url: string) => {
        const patterns = [
          /@(-?\d+\.\d+),(-?\d+\.\d+)/,
          /ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
          /q=(-?\d+\.\d+),(-?\d+\.\d+)/,
          /place\/[^/]+\/@(-?\d+\.\d+),(-?\d+\.\d+)/,
          /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
        ];
        for (const p of patterns) {
          const m = url.match(p);
          if (m) return { latitude: m[1], longitude: m[2] };
        }
        return null;
      };

      for (const gym of gyms) {
        if (gym.latitude && gym.longitude) {
          results.push({ id: gym.id, name: gym.name, status: "already_has_coordinates" });
          continue;
        }

        if (!gym.address) {
          results.push({ id: gym.id, name: gym.name, status: "no_address" });
          continue;
        }

        let coords = extractCoords(gym.address);
        if (!coords && (gym.address.includes("maps.app.goo.gl") || gym.address.includes("goo.gl"))) {
          try {
            const resp = await fetch(gym.address, { redirect: "follow" });
            const resolvedUrl = resp.url;
            coords = extractCoords(resolvedUrl);
            if (!coords) {
              const html = await resp.text();
              const htmlMatch = html.match(/center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/) ||
                                html.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
                                html.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
              if (htmlMatch) coords = { latitude: htmlMatch[1], longitude: htmlMatch[2] };
            }
          } catch (e) {
            console.error(`Error resolving URL for gym ${gym.name}:`, e);
          }
        }

        if (coords) {
          await storage.updateGym(gym.id, { latitude: coords.latitude, longitude: coords.longitude });
          results.push({ id: gym.id, name: gym.name, status: "fixed", ...coords });
        } else {
          results.push({ id: gym.id, name: gym.name, status: "could_not_resolve" });
        }
      }

      res.json({ results });
    } catch (error: any) {
      console.error("Error fixing coordinates:", error);
      res.status(500).json({ error: "Koordinatalarni tuzatishda xatolik" });
    }
  });

  app.post("/api/gyms", requireAuth, requireAdmin, async (req, res) => {
    try {
      const gymData = insertGymSchema.parse(req.body);

      if (!gymData.latitude && !gymData.longitude && gymData.address) {
        const addressUrl = gymData.address;
        const extractCoords = (url: string) => {
          const patterns = [
            /@(-?\d+\.\d+),(-?\d+\.\d+)/,
            /ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
            /q=(-?\d+\.\d+),(-?\d+\.\d+)/,
            /place\/[^/]+\/@(-?\d+\.\d+),(-?\d+\.\d+)/,
            /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
          ];
          for (const p of patterns) {
            const m = url.match(p);
            if (m) return { latitude: m[1], longitude: m[2] };
          }
          return null;
        };

        let coords = extractCoords(addressUrl);
        if (!coords && (addressUrl.includes("maps.app.goo.gl") || addressUrl.includes("goo.gl"))) {
          try {
            const resp = await fetch(addressUrl, { redirect: "follow" });
            const resolvedUrl = resp.url;
            coords = extractCoords(resolvedUrl);
            if (!coords) {
              const html = await resp.text();
              const htmlMatch = html.match(/center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/) ||
                                html.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
                                html.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
              if (htmlMatch) coords = { latitude: htmlMatch[1], longitude: htmlMatch[2] };
            }
          } catch (e) {
            console.error("Error resolving maps URL during gym creation:", e);
          }
        }
        if (coords) {
          gymData.latitude = coords.latitude;
          gymData.longitude = coords.longitude;
        }
      }

      // Generate unique 6-character access code for gym owner
      const generateAccessCode = (): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      let ownerAccessCode = generateAccessCode();
      // Ensure uniqueness - try up to 10 times
      for (let i = 0; i < 10; i++) {
        const existing = await storage.getGymByAccessCode(ownerAccessCode);
        if (!existing) break;
        ownerAccessCode = generateAccessCode();
      }

      // Vaqtinchalik QR — zal yaratilgach, ID bilan imzolangan QR ga almashtiriladi
      const placeholderQR = JSON.stringify({
        type: 'gym',
        name: gymData.name,
        timestamp: new Date().toISOString()
      });

      const gym = await storage.createGym({
        ...gymData,
        qrCode: placeholderQR,
        ownerAccessCode
      });

      // HMAC bilan imzolangan haqiqiy QR kod. Imzo tufayli QR ni faqat server
      // yasay oladi — foydalanuvchi gym ID ni bilgani bilan soxta QR tuza olmaydi.
      const actualQR = createGymQr(gym.id, gym.name);

      await storage.updateGym(gym.id, { qrCode: actualQR });

      // qrCode va ownerAccessCode faqat zal yaratilgan paytda, adminga bir marta
      // qaytariladi — boshqa hech qanday endpoint ularni oshkor qilmaydi.
      res.json({ gym: { ...gym, qrCode: actualQR, ownerAccessCode } });
    } catch (error: any) {
      console.error("Error creating gym:", error);
      res.status(400).json({ error: error.message || "Invalid gym data" });
    }
  });

  app.get("/api/gyms/:id", async (req, res) => {
    try {
      const gym = await storage.getGym(req.params.id);
      if (!gym) {
        return res.status(404).json({ error: "Gym not found" });
      }
      res.json({ gym: publicGym(gym) });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch gym" });
    }
  });

  // Zalni tahrirlash — faqat admin.
  // pickFields() mass-assignment ni yopadi: ilgari `insertGymSchema.partial()`
  // orqali ownerAccessCode, qrCode, totalEarnings va currentDebt ni ham
  // o'zgartirish mumkin edi.
  const updateGymHandler = async (req: any, res: any) => {
    try {
      const parsed = insertGymSchema.partial().parse(req.body);
      const updateData = pickFields(parsed, GYM_ADMIN_EDITABLE_FIELDS);
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "O'zgartirish uchun maydon berilmadi" });
      }
      const gym = await storage.updateGym(req.params.id, updateData);
      if (!gym) {
        return res.status(404).json({ error: "Gym not found" });
      }
      res.json({ gym: publicGym(gym) });
    } catch (error) {
      res.status(400).json({ error: "Invalid gym data" });
    }
  };

  app.put("/api/gyms/:id", requireAuth, requireAdmin, updateGymHandler);
  app.patch("/api/gyms/:id", requireAuth, requireAdmin, updateGymHandler);

  app.delete("/api/gyms/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.deleteTimeSlotsForGym(req.params.id);
      const success = await storage.deleteGym(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Gym not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete gym" });
    }
  });

  // Gym rating routes
  app.post("/api/gyms/:id/rate", requireAuth, async (req, res) => {
    try {
      const gymId = req.params.id;
      const userId = req.user!.id;
      const { bookingId, rating } = req.body;

      if (!bookingId || typeof rating !== 'number' || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "bookingId va 1-5 oralig'idagi reyting talab qilinadi" });
      }

      const gym = await storage.getGym(gymId);
      if (!gym) return res.status(404).json({ error: "Zal topilmadi" });

      const booking = await storage.getBooking(bookingId);
      if (!booking) return res.status(404).json({ error: "Bron topilmadi" });
      if (booking.userId !== userId) return res.status(403).json({ error: "Bu bron sizniki emas" });
      if (booking.gymId !== gymId) return res.status(400).json({ error: "Bron ushbu zalga tegishli emas" });
      if (!booking.isCompleted && booking.status !== 'completed') {
        return res.status(400).json({ error: "Faqat yakunlangan bronlarga baho berish mumkin" });
      }

      const existing = await storage.getGymRatingByBooking(bookingId);
      if (existing) return res.status(409).json({ error: "Bu bron uchun baho allaqachon berilgan" });

      const gymRating = await storage.createGymRating({
        userId,
        gymId,
        bookingId,
        rating: Math.round(rating),
      });

      res.json({ gymRating });
    } catch (err: any) {
      console.error("Rate gym error:", err);
      res.status(500).json({ error: "Baho berishda xatolik" });
    }
  });

  app.get("/api/gyms/:id/rating", async (req, res) => {
    try {
      const ratings = await storage.getGymRatings(req.params.id);
      const count = ratings.length;
      const average = count > 0
        ? Math.round((ratings.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
        : null;
      res.json({ average, count });
    } catch (err) {
      res.status(500).json({ error: "Reyting olishda xatolik" });
    }
  });

  app.get("/api/gyms/:id/ratings-admin", requireAuth, requireAdmin, async (req, res) => {
    try {
      const ratings = await storage.getGymRatings(req.params.id);
      res.json({ ratings });
    } catch (err) {
      res.status(500).json({ error: "Reyting olishda xatolik" });
    }
  });

  app.get("/api/my-ratings", requireAuth, async (req, res) => {
    try {
      const ratings = await storage.getUserRatings(req.user!.id);
      res.json({ ratings });
    } catch (err) {
      res.status(500).json({ error: "Reytinglarni olishda xatolik" });
    }
  });

  // Category routes
  app.get("/api/categories", async (req, res) => {
    const { CATEGORIES } = await import('@shared/categories');
    res.json({ categories: CATEGORIES });
  });

  // Time Slots routes
  /**
   * "Admin YOKI shu zalning egasi" tekshiruvi.
   *
   * Vaqt slotlarini ham admin paneli, ham zal egasi paneli boshqaradi.
   * Ilgari bu endpointlar faqat `requireAuth` ostida edi — ya'ni istalgan
   * foydalanuvchi istalgan zalga slot qo'sha, o'zgartira va o'chira olardi.
   *
   * @param gymIdFrom so'rovdan zal ID sini ajratib beruvchi funksiya
   */
  const requireGymManager = (gymIdFrom: (req: any) => Promise<string | undefined> | string | undefined) =>
    async (req: any, res: any, next: any) => {
      if (req.isAuthenticated?.() && (req.user?.isAdmin || req.session?.adminVerified)) {
        return next();
      }

      const accessCode = (req.body?.accessCode || req.query?.accessCode || req.headers['x-gym-access-code']) as string | undefined;
      if (!accessCode) {
        return res.status(403).json({ error: "Bu amal uchun admin huquqi yoki zal kirish kodi kerak" });
      }

      const gymId = await gymIdFrom(req);
      if (!gymId) {
        return res.status(400).json({ error: "Zal aniqlanmadi" });
      }

      const gym = await storage.getGymByAccessCode(String(accessCode).toUpperCase());
      if (!gym || gym.id !== gymId) {
        return res.status(403).json({ error: "Sizda bu zalni boshqarish huquqi yo'q" });
      }

      next();
    };

  const gymIdFromBody = (req: any) => req.body?.gymId as string | undefined;
  const gymIdFromSlotParam = async (req: any) => {
    const slot = await storage.getTimeSlot(req.params.id);
    return slot?.gymId;
  };

  app.get("/api/time-slots", async (req, res) => {
    try {
      const gymId = req.query.gymId as string | undefined;
      const timeSlots = await storage.getTimeSlots(gymId);
      res.json({ timeSlots });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch time slots" });
    }
  });

  app.get("/api/time-slots/:id", async (req, res) => {
    try {
      const timeSlot = await storage.getTimeSlot(req.params.id);
      if (!timeSlot) {
        return res.status(404).json({ error: "Time slot not found" });
      }
      res.json({ timeSlot });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch time slot" });
    }
  });

  app.post("/api/time-slots", requireAuth, requireGymManager(gymIdFromBody), async (req, res) => {
    try {
      const timeSlotData = insertTimeSlotSchema.parse(req.body);

      const gym = await storage.getGym(timeSlotData.gymId);
      if (!gym) {
        return res.status(404).json({ error: "Gym not found" });
      }

      // Per-gym dam kunlari tekshiruvi (eski hardcoded Yakshanba o'rniga)
      const dayNameToNumber: Record<string, number> = {
        'Yakshanba': 0, 'Dushanba': 1, 'Seshanba': 2, 'Chorshanba': 3,
        'Payshanba': 4, 'Juma': 5, 'Shanba': 6,
      };
      const dayNum = dayNameToNumber[timeSlotData.dayOfWeek];
      if (dayNum !== undefined && (gym.closedDays || []).includes(String(dayNum))) {
        return res.status(400).json({ error: `${timeSlotData.dayOfWeek} bu zal uchun dam olish kuni.` });
      }

      if (timeSlotData.availableSpots > timeSlotData.capacity) {
        return res.status(400).json({ error: "Available spots cannot exceed capacity" });
      }

      const timeSlot = await storage.createTimeSlot(timeSlotData);
      res.json({ timeSlot });
    } catch (error: any) {
      console.error("Error creating time slot:", error);
      res.status(400).json({ error: error.message || "Invalid time slot data" });
    }
  });

  app.put("/api/time-slots/:id", requireAuth, requireGymManager(gymIdFromSlotParam), async (req, res) => {
    try {
      const updateData = insertTimeSlotSchema.partial().parse(req.body);

      if (updateData.gymId) {
        const gym = await storage.getGym(updateData.gymId);
        if (!gym) {
          return res.status(404).json({ error: "Gym not found" });
        }
      }

      const existingSlot = await storage.getTimeSlot(req.params.id);
      if (!existingSlot) {
        return res.status(404).json({ error: "Time slot not found" });
      }

      const newCapacity = updateData.capacity ?? existingSlot.capacity;
      const bookedCount = existingSlot.capacity - existingSlot.availableSpots;
      const newAvailableSpots = Math.max(0, newCapacity - bookedCount);

      const finalUpdate = {
        ...updateData,
        capacity: newCapacity,
        availableSpots: newAvailableSpots
      };

      const timeSlot = await storage.updateTimeSlot(req.params.id, finalUpdate);
      res.json({ timeSlot });
    } catch (error) {
      res.status(400).json({ error: "Invalid time slot data" });
    }
  });

  app.delete("/api/time-slots/:id", requireAuth, requireGymManager(gymIdFromSlotParam), async (req, res) => {
    try {
      const success = await storage.deleteTimeSlot(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Time slot not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete time slot" });
    }
  });

  app.post("/api/time-slots/auto-generate", requireAuth, requireGymManager(gymIdFromBody), async (req, res) => {
    try {
      const { gymId, startHour, endHour, capacity, days } = req.body;

      if (!gymId) {
        return res.status(400).json({ error: "gymId majburiy" });
      }

      const gym = await storage.getGym(gymId);
      if (!gym) {
        return res.status(404).json({ error: "Zal topilmadi" });
      }

      const sHour = startHour || 9;
      const eHour = endHour || 21;
      const cap = capacity || 15;
      const allRequestedDays = days || ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
      // Zal dam kunlarini avtomatik generatsiyadan chiqarish
      const dayNameToNum: Record<string, number> = {
        'Yakshanba': 0, 'Dushanba': 1, 'Seshanba': 2, 'Chorshanba': 3,
        'Payshanba': 4, 'Juma': 5, 'Shanba': 6,
      };
      const gymClosedDays = gym.closedDays || [];
      const daysList = allRequestedDays.filter((d: string) => {
        const num = dayNameToNum[d];
        return num === undefined || !gymClosedDays.includes(String(num));
      });

      await storage.deleteTimeSlotsForGym(gymId);

      const createdSlots = [];
      for (const day of daysList) {
        for (let h = sHour; h < eHour; h++) {
          const startTime = `${h.toString().padStart(2, '0')}:00`;
          const endTime = `${(h + 1).toString().padStart(2, '0')}:00`;
          const slot = await storage.createTimeSlot({
            gymId,
            dayOfWeek: day,
            startTime,
            endTime,
            capacity: cap,
            availableSpots: cap,
          });
          createdSlots.push(slot);
        }
      }

      res.json({ 
        message: `${createdSlots.length} ta vaqt sloti yaratildi`,
        timeSlots: createdSlots,
        count: createdSlots.length
      });
    } catch (error: any) {
      console.error("Error auto-generating time slots:", error);
      res.status(500).json({ error: error.message || "Vaqt slotlarini yaratishda xatolik" });
    }
  });

  // Ruxsat etilgan kredit paketlari
  const allowedCreditPackages = [60, 130, 240];

  // Purchase credits (simplified - with validation)
  // Eslatma: POST /api/purchase-credits endpointi olib tashlandi.
  //
  // U hech qanday to'lov tasdig'isiz foydalanuvchi hisobiga kredit qo'shardi —
  // ya'ni istalgan foydalanuvchi `{"credits": 240}` yuborib, bepul kredit olishi
  // mumkin edi. Kredit endi faqat ikki yo'l bilan qo'shiladi:
  //   1. POST /api/credit-payments/submit -> chek admin tomonidan Telegram'da
  //      tasdiqlanadi (telegram.ts, handleCallbackQuery)
  //   2. POST /api/admin/users/:id/adjust-credits -> admin qo'lda qo'shadi

  const receiptUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    // Chek sifatida faqat rasm qabul qilinadi — ilgari filtr yo'q edi va
    // istalgan turdagi fayl yuklash mumkin edi.
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Chek sifatida faqat rasm yuklash mumkin'));
      }
    },
  });

  app.post('/api/credit-payments/submit', requireAuth, receiptUpload.single('receipt'), async (req, res) => {
    try {
      const { credits, price } = req.body;
      const creditsNum = parseInt(credits);
      const priceNum = parseInt(price);

      if (!creditsNum || !allowedCreditPackages.includes(creditsNum)) {
        return res.status(400).json({ message: "Noto'g'ri kredit paketi" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Chek rasmi yuborilmadi" });
      }

      const ext = path.extname(req.file.originalname) || '.jpg';
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
      const receiptUrl = await saveReceiptFile(req.file, uniqueName);

      const payment = await storage.createCreditPayment({
        userId: req.user!.id,
        credits: creditsNum,
        price: priceNum,
        status: 'pending',
        remainingAmount: priceNum,
      });

      await storage.updateCreditPayment(payment.id, { receiptUrl } as any);

      const user = await storage.getUser(req.user!.id);
      await sendPaymentReceiptToAdmin(
        storage,
        payment.id.trim(),
        req.file.buffer,
        user,
        creditsNum,
        priceNum,
        false,
        uniqueName
      );

      res.json({ success: true, message: "Chek yuborildi" });
    } catch (error: any) {
      console.error('Credit payment submit error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/credit-payments/active', requireAuth, async (req, res) => {
    try {
      const payment = await storage.getActiveCreditPayment(req.user!.id);
      const partialPayment = payment && payment.status === 'partial' ? payment : null;
      res.json({ payment: partialPayment });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/credit-payments/:id/receipt-remaining', requireAuth, receiptUpload.single('receipt'), async (req, res) => {
    try {
      const paymentId = req.params.id;
      const payment = await storage.getCreditPayment(paymentId);

      if (!payment || payment.userId !== req.user!.id) {
        return res.status(404).json({ message: "To'lov topilmadi" });
      }

      if (payment.status !== 'partial') {
        return res.status(400).json({ message: "Bu to'lov uchun qoldiq yo'q" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Chek rasmi yuborilmadi" });
      }

      const rExt = path.extname(req.file.originalname) || '.jpg';
      const rUniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${rExt}`;
      const receiptUrl = await saveReceiptFile(req.file, rUniqueName);
      await storage.updateCreditPayment(paymentId, { receiptUrl } as any);

      const user = await storage.getUser(req.user!.id);
      await sendPaymentReceiptToAdmin(
        storage,
        paymentId.trim(),
        req.file.buffer,
        user,
        payment.credits,
        payment.remainingAmount,
        true,
        rUniqueName
      );

      res.json({ success: true, message: "Qoldiq chek yuborildi" });
    } catch (error: any) {
      console.error('Remaining receipt upload error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get bookings
  app.get('/api/bookings', requireAuth, async (req, res) => {
    try {
      const bookings = await storage.getBookings(req.user!.id);
      
      const todayStr = getTashkentDateStr();
      const currentTime = getTashkentTimeStr();
      
      for (const booking of bookings) {
        if (!booking.isCompleted && booking.status !== 'missed' && booking.status !== 'completed') {
          if (booking.date) {
            const bookingDateStr = typeof booking.date === 'string' 
              ? booking.date.split('T')[0] 
              : new Date(booking.date).toISOString().split('T')[0];
            
            if (bookingDateStr < todayStr) {
              await storage.updateBookingStatus(booking.id, 'missed');
              booking.status = 'missed';
            } else if (bookingDateStr === todayStr && booking.scheduledEndTime) {
              const [endH, endM] = booking.scheduledEndTime.split(':').map(Number);
              const endWithGrace = `${String(endH + 1).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
              if (currentTime >= endWithGrace) {
                await storage.updateBookingStatus(booking.id, 'missed');
                booking.status = 'missed';
              }
            }
          }
        }
      }
      
      res.json({ bookings });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Cancel booking
  app.delete('/api/bookings/:id', requireAuth, async (req, res) => {
    try {
      const bookingId = req.params.id;
      const booking = await storage.getBooking(bookingId);

      if (!booking) {
        return res.status(404).json({ message: "Bron topilmadi" });
      }

      if (booking.userId !== req.user!.id) {
        return res.status(403).json({ message: "Ruxsat yo'q" });
      }

      const gym = await storage.getGym(booking.gymId);
      if (!gym) {
        return res.status(404).json({ message: "Zal topilmadi" });
      }

      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
      }

      // 2-soatlik bekor qilish siyosati
      let noRefund = false;
      if (booking.scheduledStartTime && booking.date) {
        const [slotH, slotM] = booking.scheduledStartTime.split(':').map(Number);
        // ISO datetime yoki oddiy YYYY-MM-DD formatni qo'llab-quvvatlash
        const datePart = booking.date.split('T')[0];
        const dateParts = datePart.split('-').map(Number);
        const [year, month, day] = dateParts;
        if (year && month && day && !isNaN(slotH) && !isNaN(slotM)) {
          // Toshkent UTC+5 bo'lgan slot boshlanishi vaqtini haqiqiy UTC ga aylantirish
          const slotUTC = Date.UTC(year, month - 1, day, slotH - 5, slotM);
          const nowUTC = Date.now();
          const diffHours = (slotUTC - nowUTC) / 3600000;
          // Agar 2 soatdan kam qolgan bo'lsa (shu jumladan o'tib ketgan bronlar ham)
          if (diffHours < 2) {
            noRefund = true;
          }
        }
      }

      // Bronni avval o'chiramiz — shunda parallel ikkinchi so'rov kreditni
      // ikki marta qaytarib bera olmaydi (deleteBooking faqat bir marta true qaytaradi).
      const success = await storage.deleteBooking(bookingId);
      if (!success) {
        return res.status(500).json({ message: "Bron o'chirilmadi" });
      }

      if (booking.timeSlotId) {
        await storage.releaseTimeSlotSpot(booking.timeSlotId);
      }

      if (noRefund) {
        return res.json({
          message: "Bron bekor qilindi. Boshlanishga 2 soatdan kam qolganligi sababli kredit qaytarilmadi.",
          creditsRefunded: 0,
          noRefund: true,
        });
      }

      await storage.refundUserCredits(user.id, gym.credits);

      res.json({
        message: "Bron bekor qilindi va kredit qaytarildi",
        creditsRefunded: gym.credits,
        noRefund: false,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Book a gym
  app.post('/api/book-gym', requireAuth, async (req, res) => {
    try {
      const { gymId, date, time, timeSlotId, scheduledStartTime, scheduledEndTime } = req.body;

      if (!gymId) {
        return res.status(400).json({ message: "Zal ID majburiy" });
      }

      const gym = await storage.getGym(gymId);
      if (!gym) {
        return res.status(404).json({ message: "Zal topilmadi" });
      }

      // Avval kredit muddatini tekshirish va agar muddati o'tgan bo'lsa nolga tushirish
      const user = await storage.checkAndResetExpiredCredits(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
      }

      if (user.credits < gym.credits) {
        return res.status(400).json({ message: "Kredit yetarli emas yoki muddati o'tgan" });
      }

      const todayTashkent = getTashkentDateStr();
      const currentTimeTashkent = getTashkentTimeStr();
      const bookingDate = date || todayTashkent;
      const bookingTime = time || '09:00';

      if (bookingDate < todayTashkent) {
        return res.status(400).json({ message: "O'tgan kunga bron qilib bo'lmaydi." });
      }

      if (bookingDate === todayTashkent && bookingTime <= currentTimeTashkent) {
        return res.status(400).json({ message: "O'tgan vaqtga bron qilib bo'lmaydi." });
      }

      const bookingDayOfWeek = new Date(bookingDate + 'T12:00:00').getDay();
      if ((gym.closedDays || []).includes(String(bookingDayOfWeek))) {
        return res.status(400).json({ message: "Bu kun bu zal uchun dam olish kuni. Bron qilib bo'lmaydi." });
      }

      // Kreditni atomik yechish: `WHERE credits >= gym.credits` sharti tufayli
      // parallel so'rovlar bir xil kreditni ikki marta ishlata olmaydi.
      const chargedUser = await storage.spendUserCredits(user.id, gym.credits);
      if (!chargedUser) {
        return res.status(400).json({ message: "Kredit yetarli emas yoki muddati o'tgan" });
      }

      // Yangi bron yaratish
      const qrCodeData = JSON.stringify({
        gymId,
        userId: req.user!.id,
        bookingId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      });

      const bookingToCreate: any = {
        userId: req.user!.id,
        gymId: gymId,
        date: bookingDate,
        time: bookingTime,
        qrCode: qrCodeData,
        isCompleted: false,
        status: 'pending'
      };

      if (timeSlotId) {
        const timeSlot = await storage.getTimeSlot(timeSlotId);
        if (!timeSlot) {
          await storage.refundUserCredits(user.id, gym.credits);
          return res.status(400).json({ message: "Vaqt sloti topilmadi" });
        }
        if (timeSlot.gymId !== gymId) {
          await storage.refundUserCredits(user.id, gym.credits);
          return res.status(400).json({ message: "Vaqt sloti bu zalga tegishli emas" });
        }

        // Joyni atomik band qilish — bo'sh joy bo'lmasa undefined qaytadi
        const reserved = await storage.reserveTimeSlotSpot(timeSlotId);
        if (!reserved) {
          await storage.refundUserCredits(user.id, gym.credits);
          return res.status(400).json({ message: "Bu vaqtda joy qolmagan" });
        }

        bookingToCreate.timeSlotId = timeSlotId;
        bookingToCreate.scheduledStartTime = scheduledStartTime;
        bookingToCreate.scheduledEndTime = scheduledEndTime;
      }

      let booking;
      try {
        booking = await storage.createBooking(bookingToCreate);
      } catch (createErr) {
        // Bron yaratilmasa, yechilgan kredit va band qilingan joyni qaytaramiz
        await storage.refundUserCredits(user.id, gym.credits);
        if (timeSlotId) await storage.releaseTimeSlotSpot(timeSlotId);
        throw createErr;
      }

      res.json({
        message: "Zal muvaffaqiyatli bron qilindi",
        booking,
        creditsUsed: gym.credits
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Video Collections routes
  app.get('/api/collections', async (req, res) => {
    try {
      const collections = await storage.getVideoCollections();
      const allClasses = await storage.getClasses();

      // Authenticated user uchun purchase statusini qo'shish
      const userId = (req as any).user?.id;
      const purchasedIds = new Set<string>();
      if (userId) {
        const purchases = await storage.getUserPurchases(userId);
        purchases.forEach(p => purchasedIds.add(p.collectionId));
      }

      const collectionsWithMeta = collections.map(collection => ({
        ...collection,
        videoCount: allClasses.filter(c => c.collectionId === collection.id).length,
        isPurchased: collection.isFree || purchasedIds.has(collection.id),
      }));

      res.json({ collections: collectionsWithMeta });
    } catch (error: any) {
      console.error("Error fetching collections:", error);
      res.status(500).json({ error: error.message || 'Failed to fetch collections' });
    }
  });

  app.get('/api/collections/:id', async (req, res) => {
    try {
      const collection = await storage.getVideoCollection(req.params.id);
      if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
      }
      const userId = (req as any).user?.id;
      let isPurchased = collection.isFree;
      if (userId && !isPurchased) {
        isPurchased = await storage.hasUserPurchasedCollection(userId, collection.id);
      }
      const allClasses = await storage.getClasses(collection.id);
      res.json({ collection: { ...collection, isPurchased, videoCount: allClasses.length } });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch collection' });
    }
  });

  app.post('/api/collections', requireAuth, requireAdmin, async (req, res) => {
    try {
      const collectionData = insertVideoCollectionSchema.parse(req.body);
      const collection = await storage.createVideoCollection(collectionData);
      res.json({ collection });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create collection' });
    }
  });

  app.put('/api/collections/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const updateData = insertVideoCollectionSchema.partial().parse(req.body);
      const collection = await storage.updateVideoCollection(req.params.id, updateData);
      if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
      }
      res.json({ collection });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update collection' });
    }
  });

  app.delete('/api/collections/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteVideoCollection(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Collection not found' });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete collection' });
    }
  });

  // Admin panel endpointlari — barchasi requireAuth + requireAdmin ostida.
  // Ilgari bu to'rt endpoint umuman himoyalanmagan edi: istalgan odam
  // video darslarni yarata, o'zgartira va o'chira olardi.
  app.get('/api/admin/classes', requireAuth, requireAdmin, async (req, res) => {
    try {
      const collectionId = req.query.collectionId as string | undefined;
      const classes = await storage.getClasses(collectionId);
      res.json({ classes });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch classes' });
    }
  });

  app.post('/api/admin/classes', requireAuth, requireAdmin, async (req, res) => {
    try {
      const classData = insertOnlineClassSchema.parse(req.body);
      const newClass = await storage.createClass(classData);
      res.json({ class: newClass });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create class' });
    }
  });

  app.put('/api/admin/classes/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const updateData = insertOnlineClassSchema.partial().parse(req.body);
      const updatedClass = await storage.updateClass(req.params.id, updateData);
      if (!updatedClass) {
        return res.status(404).json({ error: 'Class not found' });
      }
      res.json({ class: updatedClass });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update class' });
    }
  });

  app.delete('/api/admin/classes/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.deleteClass(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete class' });
    }
  });

  // Online Classes routes - foydalanuvchilar uchun
  app.get('/api/classes', requireAuth, async (req, res) => {
    try {
      const collectionId = req.query.collectionId as string | undefined;

      if (collectionId) {
        const collection = await storage.getVideoCollection(collectionId);
        if (!collection) return res.status(404).json({ error: "Kurs topilmadi" });

        // Bepul kurs yoki sotib olingan kurs
        const hasAccess = collection.isFree || 
          await storage.hasUserPurchasedCollection(req.user!.id, collectionId);

        if (!hasAccess) {
          return res.status(403).json({ error: "Bu kursga kirish uchun kredit sarflang" });
        }
        const classes = await storage.getClasses(collectionId);
        return res.json({ classes });
      }

      // Barcha kirish huquqi bor kurslar videolari
      const allCollections = await storage.getVideoCollections();
      const purchases = await storage.getUserPurchases(req.user!.id);
      const purchasedIds = new Set(purchases.map(p => p.collectionId));
      const accessibleIds = allCollections
        .filter(c => c.isFree || purchasedIds.has(c.id))
        .map(c => c.id);

      if (accessibleIds.length === 0) return res.json({ classes: [] });

      const allClasses = await storage.getClasses();
      const userClasses = allClasses.filter(c => c.collectionId && accessibleIds.includes(c.collectionId));
      res.json({ classes: userClasses });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch classes' });
    }
  });

  app.get('/api/classes/:id', requireAuth, async (req, res) => {
    try {
      const classItem = await storage.getClass(req.params.id);
      if (!classItem) {
        return res.status(404).json({ error: 'Class not found' });
      }

      // Admin uchun ruxsat berish
      if (req.user!.isAdmin) {
        return res.json({ class: classItem });
      }

      // Oddiy foydalanuvchi uchun sotib olingan to'plamni tekshirish
      if (classItem.collectionId) {
        const hasPurchased = await storage.hasUserPurchasedCollection(req.user!.id, classItem.collectionId);
        if (!hasPurchased) {
          return res.status(403).json({ error: "Bu darsga ruxsat yo'q" });
        }
      }

      res.json({ class: classItem });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch class' });
    }
  });

  app.post('/api/classes', requireAuth, async (req, res) => {
    try {
      // Faqat adminlar video qo'sha oladi
      if (!req.user!.isAdmin) {
        return res.status(403).json({ error: 'Faqat adminlar video qo\'sha oladi' });
      }

      const classData = insertOnlineClassSchema.parse(req.body);
      const newClass = await storage.createClass(classData);
      res.json({ class: newClass });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create class' });
    }
  });

  app.delete('/api/classes/:id', requireAuth, async (req, res) => {
    try {
      // Faqat adminlar video o'chira oladi
      if (!req.user!.isAdmin) {
        return res.status(403).json({ error: 'Faqat adminlar video o\'chira oladi' });
      }

      await storage.deleteClass(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete class' });
    }
  });

  // Kurs ochish (kredit asosida)
  app.post('/api/collections/:id/purchase', requireAuth, async (req, res) => {
    try {
      const collectionId = req.params.id;
      const user = req.user!;

      const collection = await storage.getVideoCollection(collectionId);
      if (!collection) {
        return res.status(404).json({ message: "Kurs topilmadi" });
      }

      // Allaqachon sotib olinganmi?
      const alreadyPurchased = await storage.hasUserPurchasedCollection(user.id, collectionId);
      if (alreadyPurchased || collection.isFree) {
        return res.status(400).json({ message: "Siz bu kursga allaqachon kirish huquqiga egasiz" });
      }

      const creditCost = collection.price || 0;

      // Kredit yetarlimi?
      if ((user.credits || 0) < creditCost) {
        return res.status(400).json({ 
          message: `Kredit yetarli emas. Kerak: ${creditCost}, Mavjud: ${user.credits || 0}` 
        });
      }

      // Kreditni ayirish
      const newCredits = (user.credits || 0) - creditCost;
      await storage.updateUserCredits(user.id, newCredits);

      // Kirish huquqini saqlash
      await storage.createUserPurchase({ userId: user.id, collectionId });

      console.log(`✅ Kurs ochildi: "${collection.name}" — ${user.id} foydalanuvchi ${creditCost} kredit sarfladi`);

      res.json({ success: true, message: "Kurs muvaffaqiyatli ochildi", newCredits });
    } catch (error: any) {
      console.error('Collection purchase error:', error);
      res.status(500).json({ message: error.message || "Serverda xatolik" });
    }
  });

  // QR kod tekshirish va tasdiqlash
  // Credit value: 1 kredit = 30,000 so'm (gym earns this per credit used)
  const CREDIT_VALUE_UZS = 30000;

  app.post('/api/verify-qr', requireAuth, async (req, res) => {
    try {
      const { qrCode, bookingId } = req.body;

      if (!qrCode) {
        return res.status(400).json({ message: "QR kod majburiy" });
      }

      // QR kod formatini tekshirish
      let qrData;
      try {
        qrData = JSON.parse(qrCode);
      } catch (e) {
        return res.status(400).json({
          message: "QR kod formati noto'g'ri",
          success: false
        });
      }

      // Zalni topish - avval to'g'ridan-to'g'ri ID orqali
      const allGyms = await storage.getGyms();
      let gym = allGyms.find(g => g.id === qrData.gymId);

      // Agar topilmasa, saqlangan QR kod orqali qidirish
      if (!gym) {
        gym = allGyms.find(g => {
          if (!g.qrCode) return false;
          try {
            const storedQrData = JSON.parse(g.qrCode);
            return storedQrData.gymId === qrData.gymId;
          } catch {
            return false;
          }
        });
      }

      if (!gym) {
        return res.status(404).json({
          message: "Zal topilmadi. QR kod eskirgan bo'lishi mumkin.",
          success: false
        });
      }

      // QR haqiqiyligini tekshirish.
      //
      // Ilgari serverga faqat `{"gymId": "..."}` yuborish kifoya edi va gym ID lar
      // ommaviy bo'lgani uchun foydalanuvchi zalga bormasdan bronni yopib,
      // zalga pul hisoblanishiga sabab bo'lishi mumkin edi.
      // Endi QR yo HMAC imzosiga ega bo'lishi, yo bazadagi saqlangan matn bilan
      // aynan mos kelishi shart (saqlangan matn endi hech qayerda oshkor qilinmaydi).
      if (!isAuthenticGymQr(qrCode, qrData, gym.qrCode)) {
        console.warn(`[QR] Soxta QR urinishi: user=${req.user!.id}, gym=${gym.id}`);
        return res.status(400).json({
          message: "QR kod haqiqiy emas. Zaldagi rasmiy QR kodni skanerlang.",
          success: false
        });
      }

      // Foydalanuvchining bronini topish
      const bookings = await storage.getBookings(req.user!.id);
      let booking;
      
      if (bookingId) {
        // Agar bookingId berilgan bo'lsa, aniq shu bronni topish
        booking = bookings.find(b => b.id === bookingId && !b.isCompleted);
        if (booking && booking.gymId !== gym.id) {
          return res.status(400).json({
            message: "Bu QR kod tanlangan bron uchun emas. To'g'ri zal QR kodini skanerlang.",
            success: false
          });
        }
      } else {
        // Agar bookingId berilmagan bo'lsa, bu zal uchun faol bronni topish
        booking = bookings.find(b => b.gymId === gym.id && !b.isCompleted);
      }

      if (!booking) {
        return res.status(404).json({
          message: "Bu zal uchun faol bron topilmadi",
          success: false
        });
      }

      if (booking.isCompleted) {
        return res.status(400).json({
          message: "Bu QR kod allaqachon ishlatilgan",
          success: false
        });
      }

      // Vaqt sloti bo'lsa, vaqtni tekshirish (Toshkent vaqtida)
      if (booking.timeSlotId && booking.scheduledStartTime && booking.date) {
        const tashkentDateStr = getTashkentDateStr();
        const tashkentTimeStr = getTashkentTimeStr();
        
        const bookingDateStr = typeof booking.date === 'string'
          ? booking.date.split('T')[0]
          : new Date(booking.date).toISOString().split('T')[0];
        
        const [startHour, startMin] = booking.scheduledStartTime.split(':').map(Number);
        const [curHour, curMin] = tashkentTimeStr.split(':').map(Number);
        
        const scheduledMinutes = startHour * 60 + startMin;
        const currentMinutes = curHour * 60 + curMin;
        
        // Faqat bugungi bron uchun vaqt tekshirish
        if (bookingDateStr === tashkentDateStr) {
          const diffMinutes = currentMinutes - scheduledMinutes;
          
          // Agar 40 minutdan oldin kelsa, hali erta - countdown ko'rsatish
          if (diffMinutes < -40) {
            const remainingMinutes = Math.abs(diffMinutes) - 40;
            
            return res.json({
              success: false,
              earlyArrival: true,
              message: `Vaqtingiz hali kelmadi. ${remainingMinutes} minut qoldi.`,
              remainingMinutes: remainingMinutes,
              scheduledTime: booking.scheduledStartTime,
              scheduledDate: booking.date
            });
          }
          
          // Agar 60 minutdan keyin kelsa, ulgirmadi
          if (diffMinutes > 60) {
            await storage.updateBookingStatus(booking.id, 'missed');
            
            return res.json({
              success: false,
              missed: true,
              message: "Afsuski, siz vaqtdan o'tib ketdingiz. Bron bekor qilindi.",
              scheduledTime: booking.scheduledStartTime,
              scheduledDate: booking.date
            });
          }
        } else if (bookingDateStr < tashkentDateStr) {
          // O'tgan kungi bron - missed
          await storage.updateBookingStatus(booking.id, 'missed');
          
          return res.json({
            success: false,
            missed: true,
            message: "Afsuski, bu bronning vaqti o'tib ketgan.",
            scheduledTime: booking.scheduledStartTime,
            scheduledDate: booking.date
          });
        } else {
          // Kelajakdagi bron - erta kelgan
          const bookingDateObj = new Date(bookingDateStr + 'T12:00:00');
          const dayNames = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
          const dayName = dayNames[bookingDateObj.getDay()];
          
          return res.json({
            success: false,
            earlyArrival: true,
            message: `Broningiz ${dayName}, ${bookingDateStr} kuni soat ${booking.scheduledStartTime} da. Hali erta!`,
            remainingMinutes: 0,
            scheduledTime: booking.scheduledStartTime,
            scheduledDate: booking.date
          });
        }
      }

      // Bronni tasdiqlash
      await storage.completeBooking(booking.id);
      await storage.updateBookingStatus(booking.id, 'completed');

      const user = await storage.getUser(req.user!.id);

      // Record gym visit and update earnings
      if (user) {
        const creditsUsed = gym.credits;
        const amountEarned = creditsUsed * CREDIT_VALUE_UZS;

        // Create gym visit record
        await storage.createGymVisit({
          gymId: gym.id,
          visitorName: user.name || user.phone || 'Mehmon',
          visitorProfileImage: user.profileImageUrl || null,
          creditsUsed: creditsUsed,
          amountEarned: amountEarned,
        });

        // Update gym earnings and debt
        await storage.updateGymEarnings(gym.id, amountEarned);

        console.log(`Visit recorded: ${user.name || user.phone} at ${gym.name}, earned ${amountEarned} so'm`);
      }

      res.json({
        success: true,
        message: "QR kod tasdiqlandi! Xush kelibsiz!",
        booking,
        gym: publicGym(gym)
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // SMS kirish endpointlari
  app.post('/api/sms/send', rateLimit('sms-send', {
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: "Juda ko'p SMS so'raldi. Bir soatdan keyin urinib ko'ring.",
  }), async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) return res.status(400).json({ message: "Telefon raqami talab qilinadi" });

      const normalized = normalizePhone(phone);
      if (normalized.length < 9) return res.status(400).json({ message: "Telefon raqami noto'g'ri" });

      const result = await sendSmsCode(phone);
      if (!result.success) {
        const status = result.cooldown ? 429 : 400;
        return res.status(status).json({ message: result.message, cooldown: result.cooldown });
      }
      res.json({ success: true, message: result.message });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Xatolik yuz berdi" });
    }
  });

  app.post('/api/sms/verify', rateLimit('sms-verify', {
    windowMs: 15 * 60 * 1000,
    max: 20,
  }), async (req, res) => {
    try {
      const { phone, code } = req.body;
      if (!phone || !code) return res.status(400).json({ message: "Telefon va kod talab qilinadi" });

      const result = verifySmsCode(phone, code);
      if (!result.success) return res.status(400).json({ message: result.message });

      const normalizedPhone = '+' + normalizePhone(phone);

      let user = await storage.getUserByPhone(normalizedPhone);
      if (!user) {
        user = await storage.createUser({ phone: normalizedPhone });
      }

      req.login(user as any, async (err) => {
        if (err) return res.status(500).json({ message: "Tizimga kirishda xatolik" });
        res.json({ success: true, profileCompleted: user!.profileCompleted, user });
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Xatolik yuz berdi" });
    }
  });

  // Mavjud phone-login userga Telegram akkaunt bog'lash
  app.post('/api/telegram/link-account', requireAuth, async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ message: 'Kod talab qilinadi' });

      const upperCode = code.toUpperCase().trim();
      const sess = req.session as any;

      if (sess.codeLockedUntil && Date.now() < sess.codeLockedUntil) {
        const waitSec = Math.ceil((sess.codeLockedUntil - Date.now()) / 1000);
        return res.status(429).json({ message: `Bloklangan. ${waitSec} soniyadan keyin qayta urinib ko'ring.` });
      }

      if (!sess.linkFailedAttempts) sess.linkFailedAttempts = 0;

      const loginData = await storage.getLoginCodeByCode(upperCode);

      if (!loginData) {
        sess.linkFailedAttempts++;
        if (sess.linkFailedAttempts >= 5) {
          sess.codeLockedUntil = Date.now() + 5 * 60 * 1000;
          sess.linkFailedAttempts = 0;
          return res.status(429).json({ message: "Juda ko'p noto'g'ri urinishlar. 5 daqiqadan keyin qayta urinib ko'ring." });
        }
        return res.status(400).json({ message: "Kod noto'g'ri yoki muddati o'tgan" });
      }

      if (new Date() > new Date(loginData.expiresAt)) {
        await storage.deleteLoginCode(upperCode);
        return res.status(400).json({ message: "Kod muddati o'tgan. Botdan yangi kod oling." });
      }

      const currentUser = req.user as any;

      // Agar bu telegramId boshqa userda ro'yxatdan o'tgan bo'lsa —
      // eski userdan Telegram ma'lumotlarini olib, joriy userga o'tkazamiz
      const existingTgUser = await storage.getUserByTelegramId(loginData.telegramId);
      if (existingTgUser && existingTgUser.id !== currentUser.id) {
        // Eski Telegram-only userdan telegramId ni olib tashlaymiz
        await storage.updateUser(existingTgUser.id, { telegramId: null as any, chatId: null as any });
      }

      const linkedUser = await storage.updateUser(currentUser.id, {
        telegramId: loginData.telegramId,
        chatId: loginData.chatId,
      });

      // Telegram akkaunti ulangach, ADMIN_IDS bo'yicha huquqni moslash
      if (linkedUser) {
        await syncAdminFlag(storage, linkedUser);
      }

      await storage.deleteLoginCode(upperCode);
      sess.linkFailedAttempts = 0;
      sess.codeLockedUntil = undefined;

      res.json({ success: true, message: "Telegram muvaffaqiyatli bog'landi" });
    } catch (err: any) {
      console.error('[Telegram] link-account error:', err);
      res.status(500).json({ message: 'Server xatoligi' });
    }
  });

  // Telegram bot ulangan-ulmaganligi tekshirish
  app.get('/api/check-telegram-linked', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const fullUser = await storage.getUser(user.id);
      res.json({ linked: !!(fullUser?.chatId), botUrl: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME || 'uzfitboom_bot'}?start=auth` });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  setupTelegramBot(app, storage);

  // DANGER: Delete all users (admin only) - ENDPOINT DISABLED FOR SAFETY
  // app.delete("/api/admin/users/delete-all", requireAdmin, async (req, res) => {
  //   try {
  //     // This endpoint is disabled for safety
  //     res.status(403).json({ error: "This endpoint is disabled for safety" });
  //   } catch (error: any) {
  //     console.error("Error deleting all users:", error);
  //     res.status(500).json({ error: error.message });
  //   }
  // });

  app.post("/api/complete-profile", requireAuth, async (req, res) => {
    try {
      const profileData = completeProfileSchema.parse(req.body);

      const updatedUser = await storage.completeUserProfile(req.user!.id, profileData);

      if (!updatedUser) {
        return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
      }

      // Telegram botga ma'lumot yuborish
      if (updatedUser.telegramId) {
        const { notifyProfileCompleted } = await import('./telegram');
        await notifyProfileCompleted(updatedUser);
      }

      res.json({
        message: "Profil muvaffaqiyatli to'ldirildi",
        user: updatedUser
      });
    } catch (error: any) {
      console.error("Profil to'ldirishda xatolik:", error);
      res.status(500).json({ message: "Server xatosi" });
    }
  });

  // Admin qilish endpoint (faqat ma'lum Telegram ID uchun)
  // Eslatma: POST /api/make-admin/:telegramId olib tashlandi — u autentifikatsiyasiz
  // ishlardi va qattiq yozilgan Telegram ID ga tayanardi. Admin huquqi endi
  // ADMIN_IDS env o'zgaruvchisi va bazadagi is_admin ustuni orqali beriladi.

  // Admin - barcha foydalanuvchilarni ko'rish
  app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json({ users });
    } catch (error: any) {
      console.error("Foydalanuvchilarni olishda xatolik:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
      const bookings = await storage.getBookings(req.params.id);
      const purchases = await storage.getUserPurchases(req.params.id);
      res.json({ user, bookings, purchases });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/admin/users/:id/adjust-credits', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { amount, type, expiryDays } = req.body;
      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: "Kredit miqdori noto'g'ri" });
      }
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ message: "Foydalanuvchi topilmadi" });

      let newCredits: number;
      if (type === 'add') {
        newCredits = (user.credits || 0) + amount;
      } else if (type === 'remove') {
        newCredits = Math.max(0, (user.credits || 0) - amount);
      } else if (type === 'set') {
        newCredits = amount;
      } else {
        return res.status(400).json({ message: "Noto'g'ri tur" });
      }

      let updated;
      if (type === 'add' && expiryDays) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + expiryDays);
        updated = await storage.updateUserCreditsWithExpiry(user.id, newCredits, expiry);
      } else {
        updated = await storage.updateUserCredits(user.id, newCredits);
      }
      res.json({ user: updated });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  /**
   * Admin paroli bilan kirish.
   *
   * Ilgari bu yerda qattiq yozilgan standart parol bor edi va rate limit yo'q edi.
   * Endi birinchi sozlash ADMIN_PASSWORD env o'zgaruvchisidan olinadi va
   * urinishlar soni cheklangan.
   */
  app.post('/api/admin/verify-password', requireAuth, rateLimit('admin-password', {
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Juda ko'p urinish. 15 daqiqadan keyin qayta urinib ko'ring.",
  }), async (req, res) => {
    try {
      const { password } = req.body;

      if (!password || typeof password !== 'string') {
        return res.status(400).json({ message: "Parol kiritilmagan" });
      }

      let adminPasswordSetting = await storage.getAdminSetting('admin_password_hash');

      if (!adminPasswordSetting) {
        // Birinchi sozlash — parol faqat env orqali beriladi
        const bootstrapPassword = process.env.ADMIN_PASSWORD;
        if (!bootstrapPassword) {
          console.error('[Admin] ADMIN_PASSWORD sozlanmagan — admin paneliga kirib bo\'lmaydi');
          return res.status(503).json({
            message: "Admin paroli hali sozlanmagan. ADMIN_PASSWORD environment o'zgaruvchisini sozlang.",
          });
        }
        if (bootstrapPassword.length < 10) {
          console.error('[Admin] ADMIN_PASSWORD juda qisqa (kamida 10 belgi kerak)');
          return res.status(503).json({ message: "Admin paroli xavfsizlik talablariga javob bermaydi." });
        }
        const hashedPassword = await bcrypt.hash(bootstrapPassword, 12);
        adminPasswordSetting = await storage.setAdminSetting('admin_password_hash', hashedPassword);
      }

      const isValid = await bcrypt.compare(password, adminPasswordSetting.settingValue);

      if (!isValid) {
        console.warn(`[Admin] Noto'g'ri parol urinishi: user=${req.user!.id}`);
        return res.status(401).json({ success: false, message: "Parol noto'g'ri" });
      }

      // Session fixation ga qarshi: huquq ko'tarilishidan oldin session ID ni yangilash
      req.session.regenerate((err) => {
        if (err) {
          console.error('Admin session regenerate error:', err);
          return res.status(500).json({ message: "Server xatosi" });
        }
        // regenerate() passport ma'lumotini ham tozalaydi — qayta tiklaymiz
        req.logIn(req.user!, (loginErr) => {
          if (loginErr) {
            console.error('Admin re-login error:', loginErr);
            return res.status(500).json({ message: "Server xatosi" });
          }
          (req.session as any).adminVerified = true;
          res.json({ success: true, message: "Kirish muvaffaqiyatli" });
        });
      });
    } catch (error: any) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Server xatosi" });
    }
  });

  // Gym owner access code verification
  app.post('/api/gym-owner/verify-code', rateLimit('gym-owner-code', {
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: "Juda ko'p urinish. 15 daqiqadan keyin qayta urinib ko'ring.",
  }), async (req, res) => {
    try {
      const { accessCode } = req.body;
      
      if (!accessCode) {
        return res.status(400).json({ message: "Kirish kodi kiritilmagan" });
      }
      
      const gym = await storage.getGymByAccessCode(accessCode.toUpperCase());
      
      if (!gym) {
        return res.status(401).json({ success: false, message: "Kirish kodi noto'g'ri" });
      }
      
      res.json({ success: true, gym: { id: gym.id, name: gym.name }, message: "Kirish muvaffaqiyatli" });
    } catch (error: any) {
      console.error("Gym owner login error:", error);
      res.status(500).json({ message: "Server xatosi" });
    }
  });

  /**
   * Zal egasi kirish kodini tekshiradigan middleware.
   *
   * Ilgari GET /api/gym-owner/:gymId umuman himoyalanmagan edi — zal ID sini
   * bilgan har kim o'sha zalning tashriflari, daromadi, qarzi va QR kodini
   * ko'ra olardi (IDOR).
   */
  const requireGymOwner = async (req: any, res: any, next: any) => {
    const accessCode = (req.body?.accessCode || req.query?.accessCode || req.headers['x-gym-access-code']) as string | undefined;

    // Admin ham kira oladi
    if (req.isAuthenticated?.() && (req.user?.isAdmin || req.session?.adminVerified)) {
      return next();
    }

    if (!accessCode) {
      return res.status(401).json({ message: "Kirish kodi talab qilinadi" });
    }

    const gym = await storage.getGymByAccessCode(String(accessCode).toUpperCase());
    if (!gym || gym.id !== req.params.gymId) {
      return res.status(403).json({ message: "Sizda bu zal ma'lumotlarini ko'rish huquqi yo'q" });
    }

    req.ownerGym = gym;
    next();
  };

  // Get gym owner data (gym details, visitors, earnings)
  app.get('/api/gym-owner/:gymId', requireGymOwner, async (req, res) => {
    try {
      const gym = await storage.getGym(req.params.gymId);
      if (!gym) {
        return res.status(404).json({ message: "Zal topilmadi" });
      }
      
      const visits = await storage.getGymVisits(req.params.gymId);
      const payments = await storage.getGymPayments(req.params.gymId);
      
      res.json({ 
        gym: {
          id: gym.id,
          name: gym.name,
          imageUrl: gym.imageUrl,
          images: gym.images || [],
          address: gym.address,
          hours: gym.hours,
          closedDays: gym.closedDays || [],
          totalEarnings: gym.totalEarnings || 0,
          currentDebt: gym.currentDebt || 0,
          qrCode: gym.qrCode || null
        },
        visits,
        payments
      });
    } catch (error: any) {
      console.error("Gym owner data error:", error);
      res.status(500).json({ message: "Server xatosi" });
    }
  });

  // Update gym owner's gym (only name and imageUrl allowed)
  app.put('/api/gym-owner/:gymId', requireGymOwner, async (req, res) => {
    try {
      const updateData = pickFields(req.body, GYM_OWNER_EDITABLE_FIELDS);
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "O'zgartirish uchun maydon berilmadi" });
      }

      const updatedGym = await storage.updateGym(req.params.gymId, updateData);
      res.json({ gym: publicGym(updatedGym || {}) });
    } catch (error: any) {
      console.error("Gym owner update error:", error);
      res.status(500).json({ message: "Server xatosi" });
    }
  });

  // Record gym payment from admin (reduces gym debt)
  app.post('/api/gym-payments', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { gymId, amount, notes } = req.body;
      
      if (!gymId || !amount) {
        return res.status(400).json({ message: "Zal ID va to'lov miqdori majburiy" });
      }
      
      const paymentAmount = parseInt(amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        return res.status(400).json({ message: "To'lov miqdori musbat son bo'lishi kerak" });
      }
      
      const gym = await storage.getGym(gymId);
      if (!gym) {
        return res.status(404).json({ message: "Zal topilmadi" });
      }
      
      // Create payment record
      const payment = await storage.createGymPayment({
        gymId,
        amount: paymentAmount,
        notes: notes || ''
      });
      
      // Reduce gym's debt
      await storage.reduceGymDebt(gymId, paymentAmount);
      
      const updatedGym = await storage.getGym(gymId);
      
      res.json({ 
        success: true, 
        payment,
        gym: {
          id: updatedGym?.id,
          currentDebt: updatedGym?.currentDebt || 0,
          totalEarnings: updatedGym?.totalEarnings || 0
        }
      });
    } catch (error: any) {
      console.error("Gym payment error:", error);
      res.status(500).json({ message: "Server xatosi" });
    }
  });

  // Change admin password (requires authentication only)
  app.post('/api/admin/change-password', requireAuth, requireAdmin, rateLimit('admin-change-password', {
    windowMs: 15 * 60 * 1000,
    max: 5,
  }), async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Joriy va yangi parol kiritilishi kerak" });
      }
      
      if (typeof newPassword !== 'string' || newPassword.length < 10) {
        return res.status(400).json({ message: "Yangi parol kamida 10 ta belgidan iborat bo'lishi kerak" });
      }
      
      const adminPasswordSetting = await storage.getAdminSetting('admin_password_hash');
      
      if (!adminPasswordSetting) {
        return res.status(400).json({ message: "Admin paroli sozlanmagan" });
      }
      
      const isValid = await bcrypt.compare(currentPassword, adminPasswordSetting.settingValue);
      
      if (!isValid) {
        return res.status(401).json({ message: "Joriy parol noto'g'ri" });
      }
      
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);
      await storage.setAdminSetting('admin_password_hash', hashedNewPassword);
      
      res.json({ success: true, message: "Parol muvaffaqiyatli o'zgartirildi" });
    } catch (error: any) {
      console.error("Password change error:", error);
      res.status(500).json({ message: "Server xatosi" });
    }
  });

  // Partnership messages routes (requires authentication only)
  app.get('/api/admin/partnership-messages', requireAuth, requireAdmin, async (req, res) => {
    try {
      const messages = await storage.getPartnershipMessages();
      res.json({ messages });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/partnership-request', rateLimit('partnership', {
    windowMs: 60 * 60 * 1000,
    max: 5,
  }), async (req, res) => {
    try {
      const { hallName, phone } = req.body;
      
      if (!hallName || !phone) {
        return res.status(400).json({ message: "Zal nomi va telefon raqami kiritilishi kerak" });
      }
      
      const message = await storage.createPartnershipMessage({ hallName, phone });
      
      res.json({ success: true, message: "So'rov muvaffaqiyatli yuborildi", data: message });
    } catch (error: any) {
      console.error("Partnership request error:", error);
      res.status(500).json({ message: "Server xatosi" });
    }
  });

  app.put('/api/admin/partnership-messages/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      const message = await storage.updatePartnershipMessageStatus(req.params.id, status);
      
      if (!message) {
        return res.status(404).json({ message: "Xabar topilmadi" });
      }
      
      res.json({ success: true, message });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete('/api/admin/partnership-messages/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const success = await storage.deletePartnershipMessage(req.params.id);
      
      if (!success) {
        return res.status(404).json({ message: "Xabar topilmadi" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update user profile (name, image)
  app.put('/api/user/profile', requireAuth, async (req, res) => {
    try {
      const { name, profileImageUrl } = req.body;
      
      const updateData: any = {};
      if (name) updateData.name = name;
      if (profileImageUrl !== undefined) updateData.profileImageUrl = profileImageUrl;
      
      const updatedUser = await storage.updateUser(req.user!.id, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
      }
      
      res.json({ success: true, user: updatedUser });
    } catch (error: any) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Server xatosi" });
    }
  });

  app.get('/api/admin/analytics', requireAuth, requireAdmin, async (req, res) => {
    try {
      const metrics = await storage.getAnalyticsMetrics();
      res.json(metrics);
    } catch (error: any) {
      console.error("Analytics error:", error);
      res.status(500).json({ error: "Analitika yuklashda xatolik" });
    }
  });

  app.get('/api/admin/analytics/at-risk-users', requireAuth, requireAdmin, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const atRiskUsers = await storage.getAtRiskUsers(days);
      res.json(atRiskUsers);
    } catch (error: any) {
      res.status(500).json({ error: "Xatolik" });
    }
  });

  app.get('/api/admin/analytics/top-users', requireAuth, requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const topUsers = await storage.getTopActiveUsers(limit);
      res.json(topUsers);
    } catch (error: any) {
      res.status(500).json({ error: "Xatolik" });
    }
  });

  app.get('/api/admin/expenses', requireAuth, requireAdmin, async (req, res) => {
    try {
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const expenses = await storage.getAdminExpenses(month, year);
      res.json(expenses);
    } catch (error: any) {
      res.status(500).json({ error: "Xatolik" });
    }
  });

  app.post('/api/admin/expenses', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { month, year, marketingSpend, operationalCosts, notes } = req.body;
      if (!month || !year) {
        return res.status(400).json({ error: "Oy va yil majburiy" });
      }
      const expense = await storage.upsertAdminExpense({
        month, year,
        marketingSpend: marketingSpend || 0,
        operationalCosts: operationalCosts || 0,
        notes: notes || null,
      });
      res.json(expense);
    } catch (error: any) {
      console.error("Expense save error:", error);
      res.status(500).json({ error: "Xarajat saqlashda xatolik" });
    }
  });

  app.delete('/api/admin/expenses/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteAdminExpense(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Topilmadi" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Xatolik" });
    }
  });

  app.get('/api/admin/analytics/cac', requireAuth, requireAdmin, async (req, res) => {
    try {
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      const expenses = await storage.getAdminExpenses(month, year);
      const totalMarketing = expenses.reduce((sum, e) => sum + (e.marketingSpend || 0), 0);

      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);
      const allUsers = await storage.getAllUsers();
      const newUsers = allUsers.filter(u => {
        if (!u.createdAt) return false;
        const d = new Date(u.createdAt);
        return d >= startOfMonth && d <= endOfMonth;
      });

      const cac = newUsers.length > 0 ? Math.round(totalMarketing / newUsers.length) : 0;

      res.json({
        month, year,
        totalMarketing,
        newUsersCount: newUsers.length,
        cac,
        totalOperational: expenses.reduce((sum, e) => sum + (e.operationalCosts || 0), 0),
      });
    } catch (error: any) {
      console.error("CAC calculation error:", error);
      res.status(500).json({ error: "CAC hisoblashda xatolik" });
    }
  });

  registerMobileRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}