import { users, gyms, onlineClasses, bookings, videoCollections, userPurchases, timeSlots, adminSettings, partnershipMessages, gymVisits, gymPayments, type User, type InsertUser, type Gym, type InsertGym, type OnlineClass, type InsertOnlineClass, type Booking, type InsertBooking, type VideoCollection, type InsertVideoCollection, type UserPurchase, type InsertUserPurchase, type TimeSlot, type InsertTimeSlot, type AdminSetting, type InsertAdminSetting, type PartnershipMessage, type InsertPartnershipMessage, type GymVisit, type InsertGymVisit, type GymPayment, type InsertGymPayment } from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

// SSL sertifikat muammosini hal qilish uchun
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserCredits(id: string, credits: number): Promise<User | undefined>;
  updateUser(id: string, updateData: Partial<InsertUser>): Promise<User | undefined>;
  completeUserProfile(id: string, profileData: { name: string; age: number; gender: string }): Promise<User | undefined>;
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
  updateClass(id: string, updateData: Partial<InsertOnlineClass>): Promise<OnlineClass | undefined>;
  deleteClass(id: string): Promise<void>;
  getUserPurchases(userId: string): Promise<UserPurchase[]>;
  createUserPurchase(purchase: InsertUserPurchase): Promise<UserPurchase>;
  hasPurchased(userId: string, collectionId: string): Promise<boolean>;
  hasUserPurchasedCollection(userId: string, collectionId: string): Promise<boolean>;
  getBookings(userId?: string): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, updateData: Partial<InsertBooking>): Promise<Booking | undefined>;
  deleteBooking(id: string): Promise<boolean>;
  completeBooking(id: string): Promise<void>;
  getTimeSlots(gymId?: string): Promise<TimeSlot[]>;
  getTimeSlot(id: string): Promise<TimeSlot | undefined>;
  createTimeSlot(timeSlot: InsertTimeSlot): Promise<TimeSlot>;
  updateTimeSlot(id: string, updateData: Partial<InsertTimeSlot>): Promise<TimeSlot | undefined>;
  deleteTimeSlot(id: string): Promise<boolean>;
  deleteTimeSlotsForGym(gymId: string): Promise<void>;
  getAdminSetting(key: string): Promise<AdminSetting | undefined>;
  setAdminSetting(key: string, value: string): Promise<AdminSetting>;
  getPartnershipMessages(): Promise<PartnershipMessage[]>;
  getPartnershipMessage(id: string): Promise<PartnershipMessage | undefined>;
  createPartnershipMessage(message: InsertPartnershipMessage): Promise<PartnershipMessage>;
  updatePartnershipMessageStatus(id: string, status: string): Promise<PartnershipMessage | undefined>;
  deletePartnershipMessage(id: string): Promise<boolean>;
  getGymByAccessCode(accessCode: string): Promise<Gym | undefined>;
  getGymVisits(gymId: string): Promise<GymVisit[]>;
  createGymVisit(visit: InsertGymVisit): Promise<GymVisit>;
  getGymPayments(gymId: string): Promise<GymPayment[]>;
  createGymPayment(payment: InsertGymPayment): Promise<GymPayment>;
  updateGymEarnings(gymId: string, amountEarned: number): Promise<Gym | undefined>;
  reduceGymDebt(gymId: string, paymentAmount: number): Promise<Gym | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user || undefined;
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
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

  async updateUser(id: string, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async completeUserProfile(id: string, profileData: { name: string; age: number; gender: string }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        ...profileData, 
        profileCompleted: true 
      })
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
    try {
      return await db.select().from(videoCollections);
    } catch (error) {
      console.error("Error fetching video collections:", error);
      throw error;
    }
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
    try {
      if (collectionId) {
        return await db.select().from(onlineClasses).where(eq(onlineClasses.collectionId, collectionId));
      }
      return await db.select().from(onlineClasses);
    } catch (error) {
      console.error("Error fetching classes:", error);
      throw error;
    }
  }

  async getClass(id: string): Promise<OnlineClass | undefined> {
    const [onlineClass] = await db.select().from(onlineClasses).where(eq(onlineClasses.id, id));
    return onlineClass || undefined;
  }

  async createClass(data: InsertOnlineClass): Promise<OnlineClass> {
    const [newClass] = await db.insert(onlineClasses).values(data).returning();
    return newClass;
  }

  async updateClass(id: string, data: Partial<InsertOnlineClass>): Promise<OnlineClass | undefined> {
    const [updatedClass] = await db
      .update(onlineClasses)
      .set(data)
      .where(eq(onlineClasses.id, id))
      .returning();
    return updatedClass || undefined;
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

  async hasUserPurchasedCollection(userId: string, collectionId: string): Promise<boolean> {
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

  async getTimeSlots(gymId?: string): Promise<TimeSlot[]> {
    if (gymId) {
      return await db.select().from(timeSlots).where(eq(timeSlots.gymId, gymId));
    }
    return await db.select().from(timeSlots);
  }

  async getTimeSlot(id: string): Promise<TimeSlot | undefined> {
    const [timeSlot] = await db.select().from(timeSlots).where(eq(timeSlots.id, id));
    return timeSlot || undefined;
  }

  async createTimeSlot(insertTimeSlot: InsertTimeSlot): Promise<TimeSlot> {
    const [timeSlot] = await db
      .insert(timeSlots)
      .values(insertTimeSlot)
      .returning();
    return timeSlot;
  }

  async updateTimeSlot(id: string, updateData: Partial<InsertTimeSlot>): Promise<TimeSlot | undefined> {
    const [timeSlot] = await db
      .update(timeSlots)
      .set(updateData)
      .where(eq(timeSlots.id, id))
      .returning();
    return timeSlot || undefined;
  }

  async deleteTimeSlot(id: string): Promise<boolean> {
    const result = await db.delete(timeSlots).where(eq(timeSlots.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteTimeSlotsForGym(gymId: string): Promise<void> {
    await db.delete(timeSlots).where(eq(timeSlots.gymId, gymId));
  }

  async getAdminSetting(key: string): Promise<AdminSetting | undefined> {
    const [setting] = await db.select().from(adminSettings).where(eq(adminSettings.settingKey, key));
    return setting || undefined;
  }

  async setAdminSetting(key: string, value: string): Promise<AdminSetting> {
    const existing = await this.getAdminSetting(key);
    if (existing) {
      const [updated] = await db
        .update(adminSettings)
        .set({ settingValue: value, updatedAt: new Date() })
        .where(eq(adminSettings.settingKey, key))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(adminSettings)
        .values({ settingKey: key, settingValue: value })
        .returning();
      return created;
    }
  }

  async getPartnershipMessages(): Promise<PartnershipMessage[]> {
    return await db.select().from(partnershipMessages);
  }

  async getPartnershipMessage(id: string): Promise<PartnershipMessage | undefined> {
    const [message] = await db.select().from(partnershipMessages).where(eq(partnershipMessages.id, id));
    return message || undefined;
  }

  async createPartnershipMessage(message: InsertPartnershipMessage): Promise<PartnershipMessage> {
    const [created] = await db
      .insert(partnershipMessages)
      .values(message)
      .returning();
    return created;
  }

  async updatePartnershipMessageStatus(id: string, status: string): Promise<PartnershipMessage | undefined> {
    const [updated] = await db
      .update(partnershipMessages)
      .set({ status })
      .where(eq(partnershipMessages.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePartnershipMessage(id: string): Promise<boolean> {
    const result = await db.delete(partnershipMessages).where(eq(partnershipMessages.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getGymByAccessCode(accessCode: string): Promise<Gym | undefined> {
    const [gym] = await db.select().from(gyms).where(eq(gyms.ownerAccessCode, accessCode));
    return gym || undefined;
  }

  async getGymVisits(gymId: string): Promise<GymVisit[]> {
    return await db.select().from(gymVisits).where(eq(gymVisits.gymId, gymId));
  }

  async createGymVisit(visit: InsertGymVisit): Promise<GymVisit> {
    const [created] = await db
      .insert(gymVisits)
      .values(visit)
      .returning();
    return created;
  }

  async getGymPayments(gymId: string): Promise<GymPayment[]> {
    return await db.select().from(gymPayments).where(eq(gymPayments.gymId, gymId));
  }

  async createGymPayment(payment: InsertGymPayment): Promise<GymPayment> {
    const [created] = await db
      .insert(gymPayments)
      .values(payment)
      .returning();
    return created;
  }

  async updateGymEarnings(gymId: string, amountEarned: number): Promise<Gym | undefined> {
    const [updated] = await db
      .update(gyms)
      .set({ 
        totalEarnings: sql`COALESCE(${gyms.totalEarnings}, 0) + ${amountEarned}`,
        currentDebt: sql`COALESCE(${gyms.currentDebt}, 0) + ${amountEarned}`
      })
      .where(eq(gyms.id, gymId))
      .returning();
    return updated || undefined;
  }

  async reduceGymDebt(gymId: string, paymentAmount: number): Promise<Gym | undefined> {
    const [updated] = await db
      .update(gyms)
      .set({ 
        currentDebt: sql`GREATEST(0, COALESCE(${gyms.currentDebt}, 0) - ${paymentAmount})`
      })
      .where(eq(gyms.id, gymId))
      .returning();
    return updated || undefined;
  }
}

export const storage = new DatabaseStorage();