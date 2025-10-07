import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGymSchema, insertUserSchema, insertOnlineClassSchema, insertBookingSchema } from "@shared/schema";
import passport from "passport";
import { requireAuth, requireAdmin } from "./auth";
import bcrypt from "bcrypt";
import Stripe from "stripe";

export async function registerRoutes(app: Express): Promise<Server> {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-08-27.basil",
  });

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

  app.post("/api/gyms", requireAdmin, async (req, res) => {
    try {
      const { name, description, credits, category, imageUrl, address } = req.body;

      // QR kod uchun JSON ma'lumot yaratish
      const gymId = `gym-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const qrCodeData = JSON.stringify({
        gymId: gymId,
        type: 'gym',
        name: name,
        timestamp: new Date().toISOString()
      });

      const gym = await storage.createGym({
        name,
        description,
        credits,
        category,
        imageUrl,
        address,
        qrCode: qrCodeData
      });
      res.json({ gym });
    } catch (error) {
      console.error("Error creating gym:", error);
      res.status(400).json({ error: "Invalid gym data" });
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

  app.put("/api/gyms/:id", requireAdmin, async (req, res) => {
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

  app.delete("/api/gyms/:id", requireAdmin, async (req, res) => {
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

  // Create Stripe checkout session for purchasing credits
  app.post('/api/create-checkout-session', requireAuth, async (req, res) => {
    try {
      const { credits, price } = req.body;

      if (!credits || !price) {
        return res.status(400).json({ message: "Kredit va narx majburiy" });
      }

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
        success_url: `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/?payment=success`,
        cancel_url: `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/?payment=cancelled`,
        client_reference_id: req.user!.id,
        metadata: {
          userId: req.user!.id,
          credits: credits.toString(),
        },
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (error: any) {
      console.error('Stripe checkout error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Stripe webhook to handle successful payments
  app.post('/api/stripe-webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;

    try {
      event = req.body;
      
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        
        const userId = session.metadata?.userId;
        const credits = parseInt(session.metadata?.credits || '0');

        if (userId && credits) {
          const currentUser = await storage.getUser(userId);
          if (currentUser) {
            const newCredits = currentUser.credits + credits;
            await storage.updateUserCredits(userId, newCredits);
          }
        }
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(400).send(`Webhook Error: ${error.message}`);
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

  // Online Classes routes
  app.get('/api/classes', async (req, res) => {
    try {
      const classes = await storage.getClasses();
      res.json({ classes });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch classes' });
    }
  });

  app.post('/api/classes', requireAdmin, async (req, res) => {
    try {
      const onlineClass = await storage.createClass(req.body);
      res.json(onlineClass);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create class' });
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