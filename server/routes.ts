import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGymSchema, insertUserSchema, insertOnlineClassSchema, insertBookingSchema, insertVideoCollectionSchema, insertUserPurchaseSchema } from "@shared/schema";
import passport from "passport";
import { requireAuth, requireAdmin } from "./auth";
import bcrypt from "bcrypt";
import Stripe from "stripe";

export async function registerRoutes(app: Express): Promise<Server> {
  const stripeEnabled = !!process.env.STRIPE_SECRET_KEY;
  const stripe = stripeEnabled ? new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-08-27.basil",
  }) : null;

  if (!stripeEnabled) {
    console.log('⚠️  Stripe is disabled - payment features will use test mode');
  }

  // Stripe webhook needs raw body, so we handle it before other routes
  if (stripeEnabled && stripe) {
    app.post('/api/stripe-webhook', 
      express.raw({ type: 'application/json' }),
      async (req, res) => {
        const sig = req.headers['stripe-signature'] as string;
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        let event: Stripe.Event;

        try {
          if (webhookSecret && sig) {
            event = stripe.webhooks.constructEvent(
              req.body,
              sig,
              webhookSecret
            );
          } else {
            // Development fallback - parse the body as JSON
            const bodyString = req.body.toString('utf8');
            event = JSON.parse(bodyString);
          }
          
          if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            
            const userId = session.metadata?.userId || session.client_reference_id;
            const credits = parseInt(session.metadata?.credits || '0');

            if (userId && credits) {
              const currentUser = await storage.getUser(userId);
              if (currentUser) {
                const newCredits = currentUser.credits + credits;
                await storage.updateUserCredits(userId, newCredits);
                console.log(`Added ${credits} credits to user ${userId}. New balance: ${newCredits}`);
              }
            }
          }

          res.json({ received: true });
        } catch (error: any) {
          console.error('Webhook error:', error);
          res.status(400).send(`Webhook Error: ${error.message}`);
        }
      }
    );
  }

  // Authentication routes
  app.post("/api/register", async (req, res, next) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Bu foydalanuvchi nomi allaqachon band" });
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const userWithHashedPassword = {
        ...userData,
        password: hashedPassword
      };

      const user = await storage.createUser(userWithHashedPassword);

      req.login({ id: user.id, username: user.username, credits: user.credits, isAdmin: user.isAdmin }, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          user: {
            id: user.id,
            username: user.username,
            credits: user.credits,
            isAdmin: user.isAdmin
          }
        });
      });
    } catch (error: any) {
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
        return res.status(400).json({ message: info?.message || "Login yoki parol noto'g'ri" });
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
      const success = await storage.deleteGym(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Gym not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete gym" });
    }
  });

  // Server-side pricing for credit packages
  const creditPackages: Record<number, number> = {
    6: 5,
    13: 10,
    24: 18,
  };

  // Create Stripe checkout session for purchasing credits
  app.post('/api/create-checkout-session', requireAuth, async (req, res) => {
    try {
      const { credits } = req.body;

      if (!credits || !creditPackages[credits]) {
        return res.status(400).json({ message: "Noto'g'ri kredit paketi" });
      }

      const price = creditPackages[credits];

      // TEST MODE: If Stripe is not enabled, simulate purchase
      if (!stripeEnabled || !stripe) {
        console.log(`⚠️  TEST MODE: Simulating credit purchase for user ${req.user!.id}`);
        
        // Directly add credits to user in test mode
        const user = await storage.getUser(req.user!.id);
        if (user) {
          const newCredits = user.credits + credits;
          await storage.updateUserCredits(req.user!.id, newCredits);
          console.log(`✅ TEST MODE: Added ${credits} credits to user ${req.user!.id}. New balance: ${newCredits}`);
        }

        // Return success response
        return res.json({ 
          testMode: true,
          message: "Test rejimida kredit qo'shildi",
          credits: credits 
        });
      }
      
      // Build the base URL properly
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${credits} FitBoom Krediti`,
                description: `${credits} kredit sotib olish`,
              },
              unit_amount: Math.round(price * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${baseUrl}/?payment=success&credits=${credits}`,
        cancel_url: `${baseUrl}/?payment=cancelled`,
        client_reference_id: req.user!.id,
        metadata: {
          userId: req.user!.id,
          credits: credits.toString(),
        },
      });

      console.log('Checkout session created:', session.id);
      res.json({ sessionId: session.id, url: session.url });
    } catch (error: any) {
      console.error('Stripe checkout error:', error);
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
      const bookingData = insertBookingSchema.partial({ qrCode: true, isCompleted: true }).parse(req.body);

      if (!bookingData.gymId) {
        return res.status(400).json({ message: "Zal ID majburiy" });
      }

      const { gymId, date, time } = bookingData;

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
      const bookingTime = time || '18:00';

      // Yangi bron yaratish
      const qrCodeData = JSON.stringify({
        gymId,
        userId: req.user!.id,
        bookingId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      });

      const booking = await storage.createBooking({
        userId: req.user!.id,
        gymId,
        date: bookingDate,
        time: bookingTime,
        qrCode: qrCodeData,
      });

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
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch collections' });
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

  app.post('/api/collections', requireAdmin, async (req, res) => {
    try {
      const collectionData = insertVideoCollectionSchema.parse(req.body);
      const collection = await storage.createVideoCollection(collectionData);
      res.json({ collection });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create collection' });
    }
  });

  app.put('/api/collections/:id', requireAdmin, async (req, res) => {
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

  app.delete('/api/collections/:id', requireAdmin, async (req, res) => {
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
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch classes' });
    }
  });

  app.post('/api/classes', requireAdmin, async (req, res) => {
    try {
      const classData = insertOnlineClassSchema.parse(req.body);
      const onlineClass = await storage.createClass(classData);
      res.json(onlineClass);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create class' });
    }
  });

  app.delete('/api/classes/:id', requireAdmin, async (req, res) => {
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

  app.post('/api/purchase-collection', requireAuth, async (req, res) => {
    try {
      const { collectionId } = req.body;

      if (!collectionId) {
        return res.status(400).json({ message: "To'plam ID majburiy" });
      }

      const collection = await storage.getVideoCollection(collectionId);
      if (!collection) {
        return res.status(404).json({ message: "To'plam topilmadi" });
      }

      const alreadyPurchased = await storage.hasPurchased(req.user!.id, collectionId);
      if (alreadyPurchased) {
        return res.status(400).json({ message: "Siz bu to'plamni allaqachon sotib olgan edingiz" });
      }

      // TEST MODE: Auto purchase without payment
      if (!stripeEnabled || !stripe) {
        const purchase = await storage.createUserPurchase({
          userId: req.user!.id,
          collectionId: collectionId,
        });

        return res.json({
          message: "To'plam muvaffaqiyatli sotib olindi (test rejim)",
          purchase,
          testMode: true
        });
      }

      // TODO: Implement Stripe payment for collections
      res.status(501).json({ message: "To'lov tizimi hali ishlanmoqda" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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

  const httpServer = createServer(app);
  return httpServer;
}