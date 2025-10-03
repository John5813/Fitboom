import { users, gyms, onlineClasses, bookings, type User, type InsertUser, type Gym, type InsertGym, type OnlineClass, type InsertOnlineClass, type Booking, type InsertBooking } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserCredits(id: string, credits: number): Promise<User | undefined>;
  getGyms(): Promise<Gym[]>;
  getGym(id: string): Promise<Gym | undefined>;
  createGym(gym: InsertGym): Promise<Gym>;
  updateGym(id: string, updateData: Partial<InsertGym>): Promise<Gym | undefined>;
  deleteGym(id: string): Promise<boolean>;
  getClasses(): Promise<OnlineClass[]>;
  createClass(onlineClass: InsertOnlineClass): Promise<OnlineClass>;
  deleteClass(id: string): Promise<void>;
  getBookings(userId?: string): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, updateData: Partial<InsertBooking>): Promise<Booking | undefined>;
  deleteBooking(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserCredits(id: string, credits: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ credits })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getGyms(): Promise<Gym[]> {
    return await db.select().from(gyms);
  }

  async getGym(id: string): Promise<Gym | undefined> {
    const [gym] = await db.select().from(gyms).where(eq(gyms.id, id));
    return gym || undefined;
  }

  async createGym(insertGym: InsertGym): Promise<Gym> {
    const [gym] = await db
      .insert(gyms)
      .values(insertGym)
      .returning();
    return gym;
  }

  async updateGym(id: string, updateData: Partial<InsertGym>): Promise<Gym | undefined> {
    const [gym] = await db
      .update(gyms)
      .set(updateData)
      .where(eq(gyms.id, id))
      .returning();
    return gym || undefined;
  }

  async deleteGym(id: string): Promise<boolean> {
    const result = await db.delete(gyms).where(eq(gyms.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getClasses(): Promise<OnlineClass[]> {
    return await db.select().from(onlineClasses);
  }

  async createClass(insertClass: InsertOnlineClass): Promise<OnlineClass> {
    const [onlineClass] = await db
      .insert(onlineClasses)
      .values(insertClass)
      .returning();
    return onlineClass;
  }

  async deleteClass(id: string): Promise<void> {
    await db.delete(onlineClasses).where(eq(onlineClasses.id, id));
  }

  async getBookings(userId?: string): Promise<Booking[]> {
    if (userId) {
      return await db.select().from(bookings).where(eq(bookings.userId, userId));
    }
    return await db.select().from(bookings);
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking || undefined;
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const [booking] = await db
      .insert(bookings)
      .values(insertBooking)
      .returning();
    return booking;
  }

  async updateBooking(id: string, updateData: Partial<InsertBooking>): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set(updateData)
      .where(eq(bookings.id, id))
      .returning();
    return booking || undefined;
  }

  async deleteBooking(id: string): Promise<boolean> {
    const result = await db.delete(bookings).where(eq(bookings.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();