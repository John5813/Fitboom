import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGymSchema, insertUserSchema, insertOnlineClassSchema, insertBookingSchema, insertVideoCollectionSchema, insertUserPurchaseSchema, insertTimeSlotSchema, insertCategorySchema, completeProfileSchema } from "@shared/schema";
import passport from "passport";
import { requireAuth, requireAdmin } from "./auth";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import Stripe from "stripe";
import { setupTelegramWebhook } from "./telegram";

export async function registerRoutes(app: Express): Promise<Server> {
  // Stripe sozlamalari
  let stripe: Stripe | null = null;
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  // Rasmlar uchun papka yaratish
  const uploadsDir = path.join(process.cwd(), 'uploads');
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
  } catch (error) {
    console.error("Uploads papkasini yaratishda xatolik:", error);
  }

  // Multer sozlamalari - disk saqlash
  const multerStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  });

  const upload = multer({
    storage: multerStorage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Faqat rasm fayllarini yuklash mumkin'));
      }
    }
  });

  // Rasm yuklash endpoint
  app.post("/api/upload-image", requireAuth, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Fayl topilmadi" });
      }

      // URL yaratish
      const imageUrl = `/api/images/${req.file.filename}`;

      res.json({ imageUrl });
    } catch (error: any) {
      console.error("Rasm yuklash xatosi:", error);
      res.status(500).json({ error: "Rasm yuklashda xatolik yuz berdi" });
    }
  });

  // Rasmni olish endpoint
  app.get("/api/images/:filename", async (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(uploadsDir, filename);

      // Faylni tekshirish
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({ error: "Rasm topilmadi" });
      }

      // Content-Type ni aniqlash
      let contentType = 'image/jpeg';
      if (filename.endsWith('.png')) contentType = 'image/png';
      else if (filename.endsWith('.gif')) contentType = 'image/gif';
      else if (filename.endsWith('.webp')) contentType = 'image/webp';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.sendFile(filePath);
    } catch (error: any) {
      console.error("Rasm yuklab olish xatosi:", error);
      res.status(404).json({ error: "Rasm topilmadi" });
    }
  });

  // Authentication routes
  app.post("/api/register", async (req, res, next) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      if (userData.phone) {
        const existingUser = await storage.getUserByPhone(userData.phone);
        if (existingUser) {
          req.login({
            id: existingUser.id,
            phone: existingUser.phone || undefined,
            name: existingUser.name || undefined,
            credits: existingUser.credits,
            isAdmin: existingUser.isAdmin
          }, (err) => {
            if (err) {
              return next(err);
            }
            return res.json({
              user: {
                id: existingUser.id,
                phone: existingUser.phone,
                name: existingUser.name,
                credits: existingUser.credits,
                isAdmin: existingUser.isAdmin
              },
              existingUser: true
            });
          });
          return;
        }
      }

      const user = await storage.createUser(userData);

      req.login({ id: user.id, phone: user.phone || undefined, name: user.name || undefined, credits: user.credits, isAdmin: user.isAdmin }, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          user: {
            id: user.id,
            phone: user.phone,
            name: user.name,
            credits: user.credits,
            isAdmin: user.isAdmin
          }
        });
      });
    } catch (error: any) {
      console.error('Register error details:', error);
      res.status(400).json({
        message: error.message || "Noto'g'ri ma'lumotlar",
        errors: error.errors || undefined
      });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(400).json({ message: info?.message || "Telefon raqami noto'g'ri" });
      }
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({ user });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Chiqishda xatolik" });
      }
      res.json({ message: "Muvaffaqiyatli chiqildi" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      return res.json({ user: req.user });
    }
    res.status(401).json({ message: "Tizimga kirilmagan" });
  });

  // Gym routes
  app.get("/api/gyms", async (req, res) => {
    try {
      const gyms = await storage.getGyms();
      res.json({ gyms });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch gyms" });
    }
  });

  app.post("/api/gyms", requireAuth, async (req, res) => {
    try {
      const gymData = insertGymSchema.parse(req.body);

      // QR kod uchun JSON ma'lumot yaratish
      const gymId = `gym-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const qrCodeData = JSON.stringify({
        gymId: gymId,
        type: 'gym',
        name: gymData.name,
        timestamp: new Date().toISOString()
      });

      const gym = await storage.createGym({
        ...gymData,
        qrCode: qrCodeData
      });
      res.json({ gym });
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
      res.json({ gym });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch gym" });
    }
  });

  app.put("/api/gyms/:id", requireAuth, async (req, res) => {
    try {
      const updateData = insertGymSchema.partial().parse(req.body);
      const gym = await storage.updateGym(req.params.id, updateData);
      if (!gym) {
        return res.status(404).json({ error: "Gym not found" });
      }
      res.json({ gym });
    } catch (error) {
      res.status(400).json({ error: "Invalid gym data" });
    }
  });

  app.delete("/api/gyms/:id", requireAuth, async (req, res) => {
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

  // Category routes
  app.get("/api/categories", async (req, res) => {
    const { CATEGORIES } = await import('@shared/categories');
    res.json({ categories: CATEGORIES });
  });

  // Time Slots routes
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

  app.post("/api/time-slots", requireAuth, async (req, res) => {
    try {
      const timeSlotData = insertTimeSlotSchema.parse(req.body);

      const gym = await storage.getGym(timeSlotData.gymId);
      if (!gym) {
        return res.status(404).json({ error: "Gym not found" });
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

  app.put("/api/time-slots/:id", requireAuth, async (req, res) => {
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

      const capacity = updateData.capacity ?? existingSlot.capacity;
      const availableSpots = updateData.availableSpots ?? existingSlot.availableSpots;

      if (availableSpots > capacity) {
        return res.status(400).json({ error: "Available spots cannot exceed capacity" });
      }

      const timeSlot = await storage.updateTimeSlot(req.params.id, updateData);
      res.json({ timeSlot });
    } catch (error) {
      res.status(400).json({ error: "Invalid time slot data" });
    }
  });

  app.delete("/api/time-slots/:id", requireAuth, async (req, res) => {
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

  // Ruxsat etilgan kredit paketlari
  const allowedCreditPackages = [6, 13, 24];

  // Purchase credits (simplified - with validation)
  app.post('/api/purchase-credits', requireAuth, async (req, res) => {
    try {
      const { credits } = req.body;

      // Faqat ruxsat etilgan paketlarni qabul qilish
      if (!credits || !allowedCreditPackages.includes(credits)) {
        return res.status(400).json({ message: "Noto'g'ri kredit paketi. Faqat 6, 13 yoki 24 kredit sotib olish mumkin" });
      }

      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
      }

      const newCredits = user.credits + credits;
      await storage.updateUserCredits(req.user!.id, newCredits);

      console.log(`✅ Kredit qo'shildi: ${credits} kredit foydalanuvchi ${req.user!.id} ga. Yangi balans: ${newCredits}`);

      res.json({
        success: true,
        message: "Kredit muvaffaqiyatli qo'shildi",
        credits: newCredits
      });
    } catch (error: any) {
      console.error('Kredit qo\'shish xatosi:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get bookings
  app.get('/api/bookings', requireAuth, async (req, res) => {
    try {
      const bookings = await storage.getBookings(req.user!.id);
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

      const newCredits = user.credits + gym.credits;
      await storage.updateUserCredits(user.id, newCredits);

      const success = await storage.deleteBooking(bookingId);
      if (!success) {
        return res.status(500).json({ message: "Bron o'chirilmadi" });
      }

      res.json({
        message: "Bron bekor qilindi va kredit qaytarildi",
        creditsRefunded: gym.credits
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Book a gym
  app.post('/api/book-gym', requireAuth, async (req, res) => {
    try {
      const { gymId, date, time } = req.body;

      if (!gymId) {
        return res.status(400).json({ message: "Zal ID majburiy" });
      }

      const gym = await storage.getGym(gymId);
      if (!gym) {
        return res.status(404).json({ message: "Zal topilmadi" });
      }

      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
      }

      if (user.credits < gym.credits) {
        return res.status(400).json({ message: "Kredit yetarli emas" });
      }

      const newCredits = user.credits - gym.credits;
      await storage.updateUserCredits(user.id, newCredits);

      const bookingDate = date || new Date().toISOString().split('T')[0];
      const bookingTime = time || '09:00';

      // Yangi bron yaratish
      const qrCodeData = JSON.stringify({
        gymId,
        userId: req.user!.id,
        bookingId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      });

      const bookingToCreate = {
        userId: req.user!.id,
        gymId: gymId,
        date: bookingDate,
        time: bookingTime,
        qrCode: qrCodeData,
        isCompleted: false
      };

      const booking = await storage.createBooking(bookingToCreate);

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

      // Har bir collection uchun video sonini hisoblash
      const collectionsWithCount = collections.map(collection => ({
        ...collection,
        videoCount: allClasses.filter(c => c.collectionId === collection.id).length
      }));

      res.json({ collections: collectionsWithCount });
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
      res.json({ collection });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch collection' });
    }
  });

  app.post('/api/collections', requireAuth, async (req, res) => {
    try {
      const collectionData = insertVideoCollectionSchema.parse(req.body);
      const collection = await storage.createVideoCollection(collectionData);
      res.json({ collection });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create collection' });
    }
  });

  app.put('/api/collections/:id', requireAuth, async (req, res) => {
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

  app.delete('/api/collections/:id', requireAuth, async (req, res) => {
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

  // Online Classes routes
  app.get('/api/classes', requireAuth, async (req, res) => {
    try {
      const collectionId = req.query.collectionId as string | undefined;

      // Admin uchun barcha classlarni qaytarish
      if (req.user!.isAdmin) {
        const classes = await storage.getClasses(collectionId);
        return res.json({ classes });
      }

      // Oddiy foydalanuvchilar uchun
      if (collectionId) {
        // Bitta collection uchun sotib olganligini tekshirish
        const hasPurchased = await storage.hasPurchased(req.user!.id, collectionId);
        if (!hasPurchased) {
          return res.status(403).json({ error: 'Bu to\'plamga ruxsat yo\'q' });
        }
        const classes = await storage.getClasses(collectionId);
        return res.json({ classes });
      } else {
        // CollectionId bo'lmasa, faqat sotib olingan to'plamlardagi classlarni qaytarish
        const purchases = await storage.getUserPurchases(req.user!.id);
        const purchasedCollectionIds = purchases.map(p => p.collectionId);
        const allClasses = await storage.getClasses();
        const purchasedClasses = allClasses.filter(c => purchasedCollectionIds.includes(c.collectionId));
        return res.json({ classes: purchasedClasses });
      }
    } catch (error: any) {
      console.error("Error fetching classes:", error);
      res.status(500).json({ error: error.message || 'Failed to fetch classes' });
    }
  });

  app.post('/api/classes', requireAuth, async (req, res) => {
    try {
      const classData = insertOnlineClassSchema.parse(req.body);
      const onlineClass = await storage.createClass(classData);
      res.json(onlineClass);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create class' });
    }
  });

  app.delete('/api/classes/:id', requireAuth, async (req, res) => {
    try {
      await storage.deleteClass(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete class' });
    }
  });

  // User Purchases routes
  app.get('/api/my-purchases', requireAuth, async (req, res) => {
    try {
      const purchases = await storage.getUserPurchases(req.user!.id);
      res.json({ purchases });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Stripe payment intent yaratish
  app.post('/api/create-payment-intent', requireAuth, async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "To'lov tizimi sozlanmagan" });
      }

      const { collectionId } = req.body;

      if (!collectionId) {
        return res.status(400).json({ error: "To'plam ID majburiy" });
      }

      const collection = await storage.getVideoCollection(collectionId);
      if (!collection) {
        return res.status(404).json({ error: "To'plam topilmadi" });
      }

      if (collection.isFree) {
        return res.status(400).json({ error: "Bu to'plam bepul" });
      }

      const alreadyPurchased = await storage.hasPurchased(req.user!.id, collectionId);
      if (alreadyPurchased) {
        return res.status(400).json({ error: "Siz bu to'plamni allaqachon sotib olgan edingiz" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: collection.price * 100,
        currency: "uzs",
        metadata: {
          userId: req.user!.id,
          collectionId: collectionId,
          collectionName: collection.name
        },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Payment intent yaratishda xatolik:", error);
      res.status(500).json({ error: error.message || "To'lov yaratishda xatolik" });
    }
  });

  // To'lov muvaffaqiyatli bo'lgandan so'ng sotib olishni tasdiqlash
  app.post('/api/confirm-purchase', requireAuth, async (req, res) => {
    try {
      const { collectionId, paymentIntentId } = req.body;

      if (!collectionId || !paymentIntentId) {
        return res.status(400).json({ error: "To'plam ID va to'lov ID majburiy" });
      }

      if (stripe && paymentIntentId) {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
          return res.status(400).json({ error: "To'lov muvaffaqiyatsiz" });
        }

        if (paymentIntent.metadata.userId !== req.user!.id ||
            paymentIntent.metadata.collectionId !== collectionId) {
          return res.status(400).json({ error: "To'lov ma'lumotlari mos kelmaydi" });
        }
      }

      const alreadyPurchased = await storage.hasPurchased(req.user!.id, collectionId);
      if (alreadyPurchased) {
        return res.status(400).json({ error: "Siz bu to'plamni allaqachon sotib olgan edingiz" });
      }

      const purchase = await storage.createUserPurchase({
        userId: req.user!.id,
        collectionId: collectionId,
      });

      res.json({
        success: true,
        message: "To'plam muvaffaqiyatli sotib olindi",
        purchase
      });
    } catch (error: any) {
      console.error("Sotib olishni tasdiqlashda xatolik:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Bepul to'plamlarni sotib olish (Stripe kerak emas)
  app.post('/api/purchase-free-collection', requireAuth, async (req, res) => {
    try {
      const { collectionId } = req.body;

      if (!collectionId) {
        return res.status(400).json({ error: "To'plam ID majburiy" });
      }

      const collection = await storage.getVideoCollection(collectionId);
      if (!collection) {
        return res.status(404).json({ error: "To'plam topilmadi" });
      }

      if (!collection.isFree) {
        return res.status(400).json({ error: "Bu to'plam pullik, to'lov qilishingiz kerak" });
      }

      const alreadyPurchased = await storage.hasPurchased(req.user!.id, collectionId);
      if (alreadyPurchased) {
        return res.status(400).json({ error: "Siz bu to'plamni allaqachon qo'shgansiz" });
      }

      const purchase = await storage.createUserPurchase({
        userId: req.user!.id,
        collectionId: collectionId,
      });

      res.json({
        success: true,
        message: "To'plam muvaffaqiyatli qo'shildi",
        purchase
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // QR kod tekshirish va tasdiqlash
  app.post('/api/verify-qr', requireAuth, async (req, res) => {
    try {
      const { qrCode, gymId } = req.body;

      if (!qrCode || !gymId) {
        return res.status(400).json({ message: "QR kod va gym ID majburiy" });
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

      // GymId mos kelishini tekshirish
      if (qrData.gymId !== gymId) {
        return res.status(400).json({
          message: "Bu QR kod ushbu zal uchun emas",
          success: false
        });
      }

      // Bronni topish
      const bookings = await storage.getBookings(req.user!.id);
      const booking = bookings.find(b => b.qrCode === qrCode);


      if (!booking) {
        return res.status(404).json({
          message: "Bron topilmadi yoki allaqachon ishlatilgan",
          success: false
        });
      }

      if (booking.isCompleted) {
        return res.status(400).json({
          message: "Bu QR kod allaqachon ishlatilgan",
          success: false
        });
      }

      // Bronni tasdiqlash
      await storage.completeBooking(booking.id);

      const gym = await storage.getGym(gymId);

      res.json({
        success: true,
        message: "QR kod tasdiqlandi! Xush kelibsiz!",
        booking,
        gym
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  setupTelegramWebhook(app, storage);

  // DANGER: Delete all users (admin only)
  app.delete("/api/admin/users/delete-all", requireAdmin, async (req, res) => {
    try {
      const result = await db.delete(users);
      res.json({
        success: true,
        message: "Barcha foydalanuvchilar o'chirildi",
        deletedCount: result.rowCount
      });
    } catch (error: any) {
      console.error("Error deleting all users:", error);
      res.status(500).json({ error: error.message });
    }
  });

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
  app.post("/api/make-admin/:telegramId", async (req, res) => {
    try {
      const { telegramId } = req.params;
      const ADMIN_TELEGRAM_ID = "5304482470";

      if (telegramId !== ADMIN_TELEGRAM_ID) {
        return res.status(403).json({ message: "Ruxsat yo'q" });
      }

      const user = await storage.getUserByTelegramId(telegramId);
      if (!user) {
        return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
      }

      const updatedUser = await storage.updateUser(user.id, { isAdmin: true });

      res.json({
        message: "Foydalanuvchi admin qilindi",
        user: updatedUser
      });
    } catch (error: any) {
      console.error("Admin qilishda xatolik:", error);
      res.status(500).json({ message: "Server xatosi" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}