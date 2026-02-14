import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";
import type { Express } from "express";
import session from "express-session";
import type { User } from "@shared/schema";
import bcrypt from "bcrypt";
import ConnectPgSimple from "connect-pg-simple";
import { neon } from "@neondatabase/serverless";

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
  // Require SESSION_SECRET in production
  if (app.get("env") === "production" && !process.env.SESSION_SECRET) {
    console.error("⚠️ SESSION_SECRET environment variable bo'sh!");
    console.error("Production hosting-da SESSION_SECRET sozlash shart.");
    console.error("Masalan: SESSION_SECRET=my-super-secret-key-12345");
    throw new Error("SESSION_SECRET environment variable is required in production");
  }

  // DATABASE_URL tekshirish
  if (!process.env.DATABASE_URL) {
    console.error("⚠️ DATABASE_URL environment variable bo'sh!");
    console.error("PostgreSQL database manzilini sozlang.");
    throw new Error("DATABASE_URL environment variable is required");
  }

  // Trust proxy - hosting providerlar uchun
  // Render, Railway, Vercel, Heroku kabi hosting-lar uchun zarur
  app.set("trust proxy", 1);

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "fitboom-dev-secret-change-in-production",
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

  passport.use(
    new LocalStrategy({ usernameField: 'phone', passwordField: 'phone' }, async (phone, _, done) => {
      try {
        const user = await storage.getUserByPhone(phone);
        if (!user) {
          return done(null, false, { message: "Foydalanuvchi topilmadi" });
        }
        return done(null, {
          id: user.id,
          phone: user.phone || undefined,
          telegramId: user.telegramId || undefined,
          name: user.name || undefined,
          credits: user.credits,
          isAdmin: user.isAdmin,
          profileCompleted: user.profileCompleted,
        });
      } catch (err) {
        return done(err);
      }
    })
  );

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