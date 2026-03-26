import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

const JWT_SECRET = process.env.JWT_SECRET || 'fitboom-mobile-secret-change-in-prod';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '90d';

export interface MobileTokenPayload {
  userId: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export function generateAccessToken(userId: string): string {
  return jwt.sign({ userId, type: 'access' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as any);
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN } as any);
}

export function generateTokenPair(userId: string): { accessToken: string; refreshToken: string } {
  return {
    accessToken: generateAccessToken(userId),
    refreshToken: generateRefreshToken(userId),
  };
}

export function verifyToken(token: string): MobileTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as MobileTokenPayload;
  } catch {
    return null;
  }
}

export async function requireMobileAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Token talab qilinadi' });
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload || payload.type !== 'access') {
    return res.status(401).json({ success: false, error: "Token yaroqsiz yoki muddati o'tgan" });
  }

  const user = await storage.getUser(payload.userId);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Foydalanuvchi topilmadi' });
  }

  (req as any).mobileUser = user;
  next();
}

export function mobileSuccess<T>(res: Response, data: T, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

export function mobileError(res: Response, error: string, statusCode = 400) {
  return res.status(statusCode).json({ success: false, error });
}
