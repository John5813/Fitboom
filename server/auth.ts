import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";
import type { Express } from "express";
import session from "express-session";
import type { User } from "@shared/schema";
import bcrypt from "bcrypt";

declare global {
  namespace Express {
    interface User {
      id: string;
      phone: string;
      name: string;
      credits: number;
      isAdmin: boolean;
    }
  }
}

export function setupAuth(app: Express) {
  // Require SESSION_SECRET in production
  if (app.get("env") === "production" && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required in production");
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "fitboom-dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie = {
      ...sessionSettings.cookie,
      secure: true,
    };
  }

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
          phone: user.phone,
          name: user.name,
          credits: user.credits,
          isAdmin: user.isAdmin,
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
        phone: user.phone,
        name: user.name,
        credits: user.credits,
        isAdmin: user.isAdmin,
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
  if (req.isAuthenticated() && req.user?.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Admin huquqi talab qilinadi" });
}