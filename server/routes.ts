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

  app.get("/api/user", async (req, res) => {
    if (req.isAuthenticated()) {
      // To'liq foydalanuvchi ma'lumotlarini olish
      const fullUser = await storage.getUser(req.user!.id);
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
      const gyms = await storage.getGyms();
      res.json({ gyms });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch gyms" });
    }
  });

  app.post("/api/gyms", requireAuth, async (req, res) => {
    try {
      const gymData = insertGymSchema.parse(req.body);

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

      // Create placeholder QR code - will be updated after gym is created with its ID
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

      // Now update with actual QR code containing the gym ID
      const actualQR = JSON.stringify({
        gymId: gym.id,
        type: 'gym',
        name: gym.name,
        timestamp: new Date().toISOString()
      });
      
      await storage.updateGym(gym.id, { qrCode: actualQR });
      
      res.json({ gym: { ...gym, qrCode: actualQR } });
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

  // Admin panel endpointlari - kelajakda alohida kirish tizimi qo'shiladi
  app.get('/api/admin/classes', async (req, res) => {
    try {
      const collectionId = req.query.collectionId as string | undefined;
      const classes = await storage.getClasses(collectionId);
      res.json({ classes });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch classes' });
    }
  });

  app.post('/api/admin/classes', async (req, res) => {
    try {
      const classData = insertOnlineClassSchema.parse(req.body);
      const newClass = await storage.createClass(classData);
      res.json({ class: newClass });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create class' });
    }
  });

  app.put('/api/admin/classes/:id', async (req, res) => {
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

  app.delete('/api/admin/classes/:id', async (req, res) => {
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

      // Oddiy foydalanuvchi uchun faqat sotib olingan to'plamlar
      if (collectionId) {
        const hasPurchased = await storage.hasUserPurchasedCollection(req.user!.id, collectionId);
        if (!hasPurchased) {
          return res.status(403).json({ error: "Bu to'plamga ruxsat yo'q" });
        }
        const classes = await storage.getClasses(collectionId);
        return res.json({ classes });
      }

      // Barcha sotib olingan to'plamlar videolarini qaytarish
      const purchases = await storage.getUserPurchases(req.user!.id);
      const collectionIds = purchases.map(p => p.collectionId);

      if (collectionIds.length === 0) {
        return res.json({ classes: [] });
      }

      const allClasses = await storage.getClasses();
      const userClasses = allClasses.filter(c => c.collectionId && collectionIds.includes(c.collectionId));

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

      const alreadyPurchased = await storage.hasUserPurchasedCollection(req.user!.id, collectionId);
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

      const alreadyPurchased = await storage.hasUserPurchasedCollection(req.user!.id, collectionId);
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

  // Purchase collection (test rejimi - to'lovsiz sotib olish)
  app.post('/api/purchase-collection', requireAuth, async (req, res) => {
    try {
      const { collectionId } = req.body;

      if (!collectionId) {
        return res.status(400).json({ message: "Collection ID talab qilinadi" });
      }

      const collection = await storage.getVideoCollection(collectionId);
      if (!collection) {
        return res.status(404).json({ message: "To'plam topilmadi" });
      }

      const alreadyPurchased = await storage.hasUserPurchasedCollection(req.user!.id, collectionId);
      if (alreadyPurchased) {
        return res.status(400).json({ message: "Siz bu to'plamni allaqachon sotib olgansiz" });
      }

      // Test rejimi - avtomatik sotib olish
      await storage.createUserPurchase({
        userId: req.user!.id,
        collectionId: collectionId,
      });

      console.log(`✅ To'plam sotib olindi: ${collection.name} (${collectionId}) foydalanuvchi ${req.user!.id} tomonidan`);

      res.json({ 
        message: "To'plam muvaffaqiyatli sotib olindi",
        success: true 
      });
    } catch (error) {
      console.error('Purchase error:', error);
      res.status(500).json({ message: "Serverda xatolik yuz berdi" });
    }
  });

  // Purchase free collection (eski endpoint - backward compatibility uchun)
  app.post('/api/purchase-free-collection', requireAuth, async (req, res) => {
    try {
      const { collectionId } = req.body;

      if (!collectionId) {
        return res.status(400).json({ message: "Collection ID talab qilinadi" });
      }

      const collection = await storage.getVideoCollection(collectionId);
      if (!collection) {
        return res.status(404).json({ message: "To'plam topilmadi" });
      }

      if (!collection.isFree) {
        return res.status(400).json({ message: "Bu to'plam bepul emas" });
      }

      const alreadyPurchased = await storage.hasPurchased(req.user!.id, collectionId);
      if (alreadyPurchased) {
        return res.status(400).json({ message: "Siz bu to'plamni allaqachon sotib olgansiz" });
      }

      await storage.createUserPurchase({
        userId: req.user!.id,
        collectionId: collectionId,
      });

      res.json({ message: "To'plam muvaffaqiyatli qo'shildi" });
    } catch (error) {
      console.error('Purchase error:', error);
      res.status(500).json({ message: "Serverda xatolik yuz berdi" });
    }
  });

  // QR kod tekshirish va tasdiqlash
  // Credit value: 1 kredit = 30,000 so'm (gym earns this per credit used)
  const CREDIT_VALUE_UZS = 30000;

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

      // Zalni topish - QR koddagi gymId bo'yicha
      const allGyms = await storage.getGyms();
      const gym = allGyms.find(g => {
        if (!g.qrCode) return false;
        try {
          const storedQrData = JSON.parse(g.qrCode);
          return storedQrData.gymId === qrData.gymId;
        } catch {
          return false;
        }
      });
      
      if (!gym) {
        return res.status(404).json({
          message: "Zal topilmadi",
          success: false
        });
      }

      // Foydalanuvchining bu zal uchun faol bronini topish
      const bookings = await storage.getBookings(req.user!.id);
      const booking = bookings.find(b => b.gymId === gym.id && !b.isCompleted);

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

      // Bronni tasdiqlash
      await storage.completeBooking(booking.id);

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
        gym
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  setupTelegramWebhook(app, storage);

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

      const updatedUser = await storage.updateUser(user.id, { isAdmin: true } as any);

      res.json({
        message: "Foydalanuvchi admin qilindi",
        user: updatedUser
      });
    } catch (error: any) {
      console.error("Admin qilishda xatolik:", error);
      res.status(500).json({ message: "Server xatosi" });
    }
  });


  // Admin login verification with password (bcrypt hashed)
  app.post('/api/admin/verify-password', async (req, res) => {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: "Parol kiritilmagan" });
      }
      
      const adminPasswordSetting = await storage.getAdminSetting('admin_password_hash');
      
      if (!adminPasswordSetting) {
        // First time setup - hash the default password and store it
        const defaultPassword = 'Javlon58_13.';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        await storage.setAdminSetting('admin_password_hash', hashedPassword);
        
        if (password === defaultPassword) {
          (req.session as any).adminVerified = true;
          res.json({ success: true, message: "Kirish muvaffaqiyatli" });
        } else {
          res.status(401).json({ success: false, message: "Parol noto'g'ri" });
        }
        return;
      }
      
      const isValid = await bcrypt.compare(password, adminPasswordSetting.settingValue);
      
      if (isValid) {
        (req.session as any).adminVerified = true;
        res.json({ success: true, message: "Kirish muvaffaqiyatli" });
      } else {
        res.status(401).json({ success: false, message: "Parol noto'g'ri" });
      }
    } catch (error: any) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Server xatosi" });
    }
  });

  // Gym owner access code verification
  app.post('/api/gym-owner/verify-code', async (req, res) => {
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

  // Get gym owner data (gym details, visitors, earnings)
  app.get('/api/gym-owner/:gymId', async (req, res) => {
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
          address: gym.address,
          totalEarnings: gym.totalEarnings || 0,
          currentDebt: gym.currentDebt || 0
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
  app.put('/api/gym-owner/:gymId', async (req, res) => {
    try {
      const { name, imageUrl, accessCode } = req.body;
      
      // Verify access code first
      if (!accessCode) {
        return res.status(401).json({ message: "Kirish kodi talab qilinadi" });
      }
      
      const gym = await storage.getGymByAccessCode(accessCode.toUpperCase());
      if (!gym || gym.id !== req.params.gymId) {
        return res.status(403).json({ message: "Sizda bu zalni tahrirlash huquqi yo'q" });
      }
      
      const updateData: { name?: string; imageUrl?: string } = {};
      if (name) updateData.name = name;
      if (imageUrl) updateData.imageUrl = imageUrl;
      
      const updatedGym = await storage.updateGym(req.params.gymId, updateData);
      res.json({ gym: updatedGym });
    } catch (error: any) {
      console.error("Gym owner update error:", error);
      res.status(500).json({ message: "Server xatosi" });
    }
  });

  // Record gym payment from admin (reduces gym debt)
  app.post('/api/gym-payments', async (req, res) => {
    // Check if admin is verified via password
    if (!(req.session as any).adminVerified && !(req.user as any)?.isAdmin) {
      return res.status(403).json({ message: "Admin huquqi talab qilinadi" });
    }
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
  app.post('/api/admin/change-password', requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Joriy va yangi parol kiritilishi kerak" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak" });
      }
      
      const adminPasswordSetting = await storage.getAdminSetting('admin_password_hash');
      
      if (!adminPasswordSetting) {
        return res.status(400).json({ message: "Admin paroli sozlanmagan" });
      }
      
      const isValid = await bcrypt.compare(currentPassword, adminPasswordSetting.settingValue);
      
      if (!isValid) {
        return res.status(401).json({ message: "Joriy parol noto'g'ri" });
      }
      
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await storage.setAdminSetting('admin_password_hash', hashedNewPassword);
      
      res.json({ success: true, message: "Parol muvaffaqiyatli o'zgartirildi" });
    } catch (error: any) {
      console.error("Password change error:", error);
      res.status(500).json({ message: "Server xatosi" });
    }
  });

  // Partnership messages routes (requires authentication only)
  app.get('/api/admin/partnership-messages', requireAuth, async (req, res) => {
    try {
      const messages = await storage.getPartnershipMessages();
      res.json({ messages });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/partnership-request', async (req, res) => {
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

  app.put('/api/admin/partnership-messages/:id', requireAuth, async (req, res) => {
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

  app.delete('/api/admin/partnership-messages/:id', requireAuth, async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}