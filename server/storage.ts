import { users, gyms, onlineClasses, bookings, videoCollections, userPurchases, type User, type InsertUser, type Gym, type InsertGym, type OnlineClass, type InsertOnlineClass, type Booking, type InsertBooking, type VideoCollection, type InsertVideoCollection, type UserPurchase, type InsertUserPurchase } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

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
  getVideoCollections(): Promise<VideoCollection[]>;
  getVideoCollection(id: string): Promise<VideoCollection | undefined>;
  createVideoCollection(collection: InsertVideoCollection): Promise<VideoCollection>;
  updateVideoCollection(id: string, updateData: Partial<InsertVideoCollection>): Promise<VideoCollection | undefined>;
  deleteVideoCollection(id: string): Promise<boolean>;
  getClasses(collectionId?: string): Promise<OnlineClass[]>;
  getClass(id: string): Promise<OnlineClass | undefined>;
  createClass(onlineClass: InsertOnlineClass): Promise<OnlineClass>;
  deleteClass(id: string): Promise<void>;
  getUserPurchases(userId: string): Promise<UserPurchase[]>;
  createUserPurchase(purchase: InsertUserPurchase): Promise<UserPurchase>;
  hasPurchased(userId: string, collectionId: string): Promise<boolean>;
  getBookings(userId?: string): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, updateData: Partial<InsertBooking>): Promise<Booking | undefined>;
  deleteBooking(id: string): Promise<boolean>;
  completeBooking(id: string): Promise<void>;
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

  async getVideoCollections(): Promise<VideoCollection[]> {
    return await db.select().from(videoCollections);
  }

  async getVideoCollection(id: string): Promise<VideoCollection | undefined> {
    const [collection] = await db.select().from(videoCollections).where(eq(videoCollections.id, id));
    return collection || undefined;
  }

  async createVideoCollection(insertCollection: InsertVideoCollection): Promise<VideoCollection> {
    const [collection] = await db
      .insert(videoCollections)
      .values(insertCollection)
      .returning();
    return collection;
  }

  async updateVideoCollection(id: string, updateData: Partial<InsertVideoCollection>): Promise<VideoCollection | undefined> {
    const [collection] = await db
      .update(videoCollections)
      .set(updateData)
      .where(eq(videoCollections.id, id))
      .returning();
    return collection || undefined;
  }

  async deleteVideoCollection(id: string): Promise<boolean> {
    const result = await db.delete(videoCollections).where(eq(videoCollections.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getClasses(collectionId?: string): Promise<OnlineClass[]> {
    if (collectionId) {
      return await db.select().from(onlineClasses).where(eq(onlineClasses.collectionId, collectionId));
    }
    return await db.select().from(onlineClasses);
  }

  async getClass(id: string): Promise<OnlineClass | undefined> {
    const [onlineClass] = await db.select().from(onlineClasses).where(eq(onlineClasses.id, id));
    return onlineClass || undefined;
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

  async getUserPurchases(userId: string): Promise<UserPurchase[]> {
    return await db.select().from(userPurchases).where(eq(userPurchases.userId, userId));
  }

  async createUserPurchase(insertPurchase: InsertUserPurchase): Promise<UserPurchase> {
    const [purchase] = await db
      .insert(userPurchases)
      .values(insertPurchase)
      .returning();
    return purchase;
  }

  async hasPurchased(userId: string, collectionId: string): Promise<boolean> {
    const [purchase] = await db
      .select()
      .from(userPurchases)
      .where(and(
        eq(userPurchases.userId, userId),
        eq(userPurchases.collectionId, collectionId)
      ));
    return !!purchase;
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
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async completeBooking(id: string): Promise<void> {
    await db
      .update(bookings)
      .set({ isCompleted: true })
      .where(eq(bookings.id, id));
  }
}

export const storage = new DatabaseStorage();