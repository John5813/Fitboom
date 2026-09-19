import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes, registerHealthCheck } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import { setupTelegramWebhook, setupCreditExpiryScheduler } from './telegram';
import { storage } from './storage';
import { rateLimit } from './security';
import { captureError } from './errorTracking';

const apiRateLimit = rateLimit('api-global', {
  windowMs: 60 * 1000,
  max: 300,
});

process.on('uncaughtException', (err) => {
  const msg = err.message || '';
  // Neon serverless DB ulanish uzilishi — bu normal holat, server ishini davom ettiradi
  if (
    msg.includes('terminating connection') ||
    msg.includes('Connection terminated') ||
    msg.includes('connection timeout') ||
    msg.includes('ECONNRESET')
  ) {
    console.warn('[WARN] DB connection reset (normal for serverless):', msg);
    return;
  }
  console.error('[FATAL] Uncaught Exception:', msg, err.stack);
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
  captureError(storage, {
    source: 'server',
    message: `Unhandled rejection: ${reason?.message ?? String(reason)}`,
    stack: reason?.stack,
    context: 'process',
  });
});

process.on('SIGTERM', () => {
  console.log('[SERVER] SIGTERM received, shutting down...');
  process.exit(0);
});

const app = express();

/**
 * CORS.
 *
 * Ilgari `origin: '*'` edi. Web ilova serverning o'zidan beriladi, shuning uchun
 * unga CORS umuman kerak emas; mobil ilova (Capacitor) esa aniq origin'lardan
 * keladi. ALLOWED_ORIGINS env orqali qo'shimcha domen qo'shish mumkin.
 */
const defaultAllowedOrigins = [
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
  'http://localhost:5000',
  'http://localhost:5173',
];
const allowedOrigins = new Set([
  ...defaultAllowedOrigins,
  // Replit deploy domenlari avtomatik qo'shiladi
  ...(process.env.REPLIT_DOMAINS || '')
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => `https://${d}`),
  ...(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
]);

app.use(cors({
  origin(origin, callback) {
    // origin yo'q = same-origin yoki server-to-server so'rov (mobil native ham)
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    console.warn('[CORS] Ruxsat etilmagan origin rad etildi:', origin);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Gym-Access-Code'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
registerHealthCheck(app);

// Umumiy API rate limit — Telegram webhook'idan tashqari
// (webhook o'z sirini tekshiradi va Telegram ko'p so'rov yuborishi mumkin)
app.use('/api', (req, res, next) => {
  if (req.path === '/telegram/webhook') return next();
  return apiRateLimit(req, res, next);
});

setupAuth(app);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  // Eslatma: ilgari bu yerda javob tanasi ham log qilinardi — natijada
  // JWT tokenlar, telefon raqamlar va foydalanuvchi ma'lumotlari log'ga tushardi.
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error('[EXPRESS ERROR]', message, err.stack);

    // 5xx xatolar jurnalga tushadi va yangi bo'lsa Telegram'ga xabar ketadi.
    // 4xx — bu foydalanuvchi xatosi (noto'g'ri ma'lumot), qayd etilmaydi.
    if (status >= 500) {
      captureError(storage, {
        source: 'server',
        message,
        stack: err.stack,
        context: `${req.method} ${req.path}`,
        userId: (req as any).user?.id ?? null,
      });
    }

    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);

    await setupTelegramWebhook();
    setupCreditExpiryScheduler(storage);
  });
})();
