import passport from "passport";
import { storage } from "./storage";
import type { Express } from "express";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";

declare global {
  namespace Express {
    interface User {
      id: string;
      phone?: string;
      telegramId?: string;
      name?: string;
      credits: number;
      isAdmin: boolean;
      profileCompleted?: boolean;
    }
  }
}

const PgSession = ConnectPgSimple(session);

export function setupAuth(app: Express) {
  // SESSION_SECRET har doim talab qilinadi.
  // Ilgari faqat production-da tekshirilardi va dev-da qattiq yozilgan qiymat
  // ishlatilardi — bu qiymat bilan session cookie'larni soxtalashtirish mumkin edi.
  if (!process.env.SESSION_SECRET) {
    console.error("⚠️ SESSION_SECRET environment variable bo'sh!");
    console.error("Masalan: SESSION_SECRET=$(openssl rand -base64 32)");
    throw new Error("SESSION_SECRET environment variable is required");
  }

  if (!process.env.DATABASE_URL) {
    console.error("⚠️ DATABASE_URL environment variable bo'sh!");
    console.error("PostgreSQL database manzilini sozlang.");
    throw new Error("DATABASE_URL environment variable is required");
  }

  // Trust proxy - hosting providerlar uchun (Render, Railway, Vercel, Heroku)
  app.set("trust proxy", 1);

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 kun
      httpOnly: true, // XSS himoyasi
      sameSite: app.get("env") === "production" ? "none" : "lax",
      secure: app.get("env") === "production", // HTTPS da secure
    },
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Eslatma: ilgari bu yerda passport-local strategiyasi bor edi va u
  // telefon raqamini ham login, ham parol sifatida ishlatardi — ya'ni faqat
  // telefon raqamini bilgan odam istalgan akkauntga kira olardi.
  // Haqiqiy autentifikatsiya Telegram kodi (telegram.ts) va SMS OTP (sms.ts)
  // orqali amalga oshiriladi, shuning uchun strategiya butunlay olib tashlandi.

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, {
        id: user.id,
        phone: user.phone || undefined,
        telegramId: user.telegramId || undefined,
        name: user.name || undefined,
        credits: user.credits,
        isAdmin: user.isAdmin,
        profileCompleted: user.profileCompleted,
      });
    } catch (err) {
      done(err);
    }
  });
}

export function requireAuth(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Tizimga kirish talab qilinadi" });
}

export function requireAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated() && (req.user?.isAdmin || req.session?.adminVerified)) {
    return next();
  }
  res.status(403).json({ message: "Admin huquqi talab qilinadi" });
}
