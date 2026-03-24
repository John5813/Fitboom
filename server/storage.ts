import { users, gyms, onlineClasses, bookings, videoCollections, userPurchases, timeSlots, adminSettings, partnershipMessages, gymVisits, gymPayments, creditPayments, loginCodes, gymRatings, adminExpenses, type User, type InsertUser, type Gym, type InsertGym, type OnlineClass, type InsertOnlineClass, type Booking, type InsertBooking, type VideoCollection, type InsertVideoCollection, type UserPurchase, type InsertUserPurchase, type TimeSlot, type InsertTimeSlot, type AdminSetting, type InsertAdminSetting, type PartnershipMessage, type InsertPartnershipMessage, type GymVisit, type InsertGymVisit, type GymPayment, type InsertGymPayment, type CreditPayment, type InsertCreditPayment, type LoginCode, type InsertLoginCode, type GymRating, type InsertGymRating, type AdminExpense, type InsertAdminExpense } from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";


export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserCredits(id: string, credits: number): Promise<User | undefined>;
  updateUserCreditsWithExpiry(id: string, credits: number, expiryDate: Date): Promise<User | undefined>;
  checkAndResetExpiredCredits(id: string): Promise<User | undefined>;
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
  updateBookingStatus(id: string, status: string): Promise<void>;
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
  getAllUsers(): Promise<User[]>;
  createCreditPayment(payment: InsertCreditPayment): Promise<CreditPayment>;
  getCreditPayment(id: string): Promise<CreditPayment | undefined>;
  updateCreditPayment(id: string, updateData: Partial<InsertCreditPayment>): Promise<CreditPayment | undefined>;
  getPendingCreditPayments(userId: string): Promise<CreditPayment[]>;
  getActiveCreditPayment(userId: string): Promise<CreditPayment | undefined>;
  getAllPendingCreditPayments(): Promise<CreditPayment[]>;
  getUsersWithChatId(): Promise<User[]>;
  createLoginCode(data: InsertLoginCode): Promise<LoginCode>;
  getLoginCodeByCode(code: string): Promise<LoginCode | undefined>;
  deleteLoginCode(code: string): Promise<void>;
  deleteExpiredLoginCodes(): Promise<void>;
  getLastLoginCodeTime(telegramId: string): Promise<Date | null>;
  incrementLoginCodeAttempts(code: string): Promise<number>;
  createGymRating(data: InsertGymRating): Promise<GymRating>;
  getGymRatingByBooking(bookingId: string): Promise<GymRating | undefined>;
  getGymRatings(gymId: string): Promise<GymRating[]>;
  getUserRatings(userId: string): Promise<GymRating[]>;
  getGymAverageRatings(): Promise<{ gymId: string; average: number; count: number }[]>;
  getAdminExpenses(month?: number, year?: number): Promise<AdminExpense[]>;
  getAdminExpense(id: string): Promise<AdminExpense | undefined>;
  upsertAdminExpense(expense: InsertAdminExpense): Promise<AdminExpense>;
  deleteAdminExpense(id: string): Promise<boolean>;
  getAnalyticsMetrics(): Promise<{
    dau: number;
    mau: number;
    totalRevenue: number;
    mrr: number;
    arpu: number;
    ltv: number;
    totalUsers: number;
    newUsersThisMonth: number;
    activeUsersToday: number;
    activeUsersMonth: number;
  }>;
  getAtRiskUsers(daysInactive: number): Promise<User[]>;
  getTopActiveUsers(limit: number): Promise<{ user: User; activityScore: number }[]>;
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

  async updateUserCreditsWithExpiry(id: string, credits: number, expiryDate: Date): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ credits, creditExpiryDate: expiryDate })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async checkAndResetExpiredCredits(id: string): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    if (user.creditExpiryDate && new Date() > new Date(user.creditExpiryDate) && user.credits > 0) {
      const [updatedUser] = await db
        .update(users)
        .set({ credits: 0, creditExpiryDate: null })
        .where(eq(users.id, id))
        .returning();
      return updatedUser || undefined;
    }
    return user;
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
      .values({
        ...insertGym,
        images: insertGym.images || [insertGym.imageUrl]
      })
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

  async updateBookingStatus(id: string, status: string): Promise<void> {
    await db
      .update(bookings)
      .set({ status })
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

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createCreditPayment(payment: InsertCreditPayment): Promise<CreditPayment> {
    const [created] = await db.insert(creditPayments).values(payment).returning();
    return created;
  }

  async getCreditPayment(id: string): Promise<CreditPayment | undefined> {
    const [payment] = await db.select().from(creditPayments).where(eq(creditPayments.id, id));
    return payment || undefined;
  }

  async updateCreditPayment(id: string, updateData: Partial<InsertCreditPayment>): Promise<CreditPayment | undefined> {
    const [updated] = await db.update(creditPayments).set(updateData).where(eq(creditPayments.id, id)).returning();
    return updated || undefined;
  }

  async getPendingCreditPayments(userId: string): Promise<CreditPayment[]> {
    return await db.select().from(creditPayments)
      .where(and(eq(creditPayments.userId, userId), eq(creditPayments.status, 'pending')));
  }

  async getActiveCreditPayment(userId: string): Promise<CreditPayment | undefined> {
    const results = await db.select().from(creditPayments)
      .where(and(
        eq(creditPayments.userId, userId),
        sql`status IN ('pending', 'partial')`
      ));
    const partial = results.find(p => p.status === 'partial');
    return partial || undefined;
  }

  async getAllPendingCreditPayments(): Promise<CreditPayment[]> {
    return await db.select().from(creditPayments)
      .where(sql`status IN ('pending', 'partial')`)
      .orderBy(creditPayments.createdAt);
  }

  async getUsersWithChatId(): Promise<User[]> {
    return await db.select().from(users)
      .where(sql`chat_id IS NOT NULL`);
  }

  async createLoginCode(data: InsertLoginCode): Promise<LoginCode> {
    const [created] = await db.insert(loginCodes).values(data).returning();
    return created;
  }

  async getLoginCodeByCode(code: string): Promise<LoginCode | undefined> {
    const [found] = await db.select().from(loginCodes).where(eq(loginCodes.code, code));
    return found || undefined;
  }

  async deleteLoginCode(code: string): Promise<void> {
    await db.delete(loginCodes).where(eq(loginCodes.code, code));
  }

  async deleteExpiredLoginCodes(): Promise<void> {
    await db.delete(loginCodes).where(sql`expires_at < NOW()`);
  }

  async incrementLoginCodeAttempts(code: string): Promise<number> {
    const [updated] = await db.update(loginCodes)
      .set({ attempts: sql`attempts + 1` })
      .where(eq(loginCodes.code, code))
      .returning();
    return updated ? updated.attempts : 0;
  }

  async getLastLoginCodeTime(telegramId: string): Promise<Date | null> {
    const [result] = await db.select({ createdAt: loginCodes.createdAt })
      .from(loginCodes)
      .where(eq(loginCodes.telegramId, telegramId))
      .orderBy(sql`created_at DESC`)
      .limit(1);
    return result ? result.createdAt : null;
  }

  async createGymRating(data: InsertGymRating): Promise<GymRating> {
    const [created] = await db.insert(gymRatings).values(data).returning();
    return created;
  }

  async getGymRatingByBooking(bookingId: string): Promise<GymRating | undefined> {
    const [rating] = await db.select().from(gymRatings).where(eq(gymRatings.bookingId, bookingId));
    return rating || undefined;
  }

  async getGymRatings(gymId: string): Promise<GymRating[]> {
    return await db.select().from(gymRatings).where(eq(gymRatings.gymId, gymId));
  }

  async getUserRatings(userId: string): Promise<GymRating[]> {
    return await db.select().from(gymRatings).where(eq(gymRatings.userId, userId));
  }

  async getGymAverageRatings(): Promise<{ gymId: string; average: number; count: number }[]> {
    const rows = await db
      .select({
        gymId: gymRatings.gymId,
        average: sql<number>`ROUND(AVG(${gymRatings.rating})::numeric, 1)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(gymRatings)
      .groupBy(gymRatings.gymId);
    return rows.map(r => ({
      gymId: r.gymId,
      average: Number(r.average),
      count: Number(r.count),
    }));
  }

  async getAdminExpenses(month?: number, year?: number): Promise<AdminExpense[]> {
    if (month !== undefined && year !== undefined) {
      return await db.select().from(adminExpenses)
        .where(and(eq(adminExpenses.month, month), eq(adminExpenses.year, year)));
    }
    return await db.select().from(adminExpenses);
  }

  async getAdminExpense(id: string): Promise<AdminExpense | undefined> {
    const [expense] = await db.select().from(adminExpenses).where(eq(adminExpenses.id, id));
    return expense || undefined;
  }

  async upsertAdminExpense(expense: InsertAdminExpense): Promise<AdminExpense> {
    const existing = await db.select().from(adminExpenses)
      .where(and(eq(adminExpenses.month, expense.month), eq(adminExpenses.year, expense.year)));
    if (existing.length > 0) {
      const [updated] = await db.update(adminExpenses)
        .set({ marketingSpend: expense.marketingSpend, operationalCosts: expense.operationalCosts, notes: expense.notes })
        .where(eq(adminExpenses.id, existing[0].id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(adminExpenses).values(expense).returning();
    return created;
  }

  async deleteAdminExpense(id: string): Promise<boolean> {
    const result = await db.delete(adminExpenses).where(eq(adminExpenses.id, id)).returning();
    return result.length > 0;
  }

  async getAnalyticsMetrics(): Promise<{
    dau: number; mau: number; totalRevenue: number; mrr: number; arpu: number; ltv: number;
    totalUsers: number; newUsersThisMonth: number; activeUsersToday: number; activeUsersMonth: number;
  }> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const allUsers = await db.select().from(users);
    const totalUsers = allUsers.length;

    const newUsersThisMonth = allUsers.filter(u => u.createdAt && new Date(u.createdAt) >= startOfMonth).length;

    const todayBookings = await db.select({ userId: bookings.userId })
      .from(bookings)
      .where(sql`${bookings.createdAt} >= ${startOfDay}`);
    const dauSet = new Set(todayBookings.map(b => b.userId));
    const dau = dauSet.size;

    const monthBookings = await db.select({ userId: bookings.userId })
      .from(bookings)
      .where(sql`${bookings.createdAt} >= ${startOfMonth}`);
    const mauSet = new Set(monthBookings.map(b => b.userId));
    const mau = mauSet.size;

    const revenueResult = await db.select({
      total: sql<number>`COALESCE(SUM(${creditPayments.price}), 0)`
    }).from(creditPayments).where(eq(creditPayments.status, 'approved'));
    const totalRevenue = Number(revenueResult[0]?.total || 0);

    const monthRevenueResult = await db.select({
      total: sql<number>`COALESCE(SUM(${creditPayments.price}), 0)`
    }).from(creditPayments)
      .where(and(eq(creditPayments.status, 'approved'), sql`${creditPayments.createdAt} >= ${startOfMonth}`));
    const mrr = Number(monthRevenueResult[0]?.total || 0);

    const arpu = totalUsers > 0 ? Math.round(totalRevenue / totalUsers) : 0;

    const payingUsersResult = await db.select({
      count: sql<number>`COUNT(DISTINCT ${creditPayments.userId})`
    }).from(creditPayments).where(eq(creditPayments.status, 'approved'));
    const payingUsers = Number(payingUsersResult[0]?.count || 0);
    const ltv = payingUsers > 0 ? Math.round(totalRevenue / payingUsers) : 0;

    return {
      dau, mau, totalRevenue, mrr, arpu, ltv,
      totalUsers, newUsersThisMonth,
      activeUsersToday: dau, activeUsersMonth: mau,
    };
  }

  async getAtRiskUsers(daysInactive: number): Promise<User[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysInactive);

    const activeUserIds = await db.select({ userId: bookings.userId })
      .from(bookings)
      .where(sql`${bookings.createdAt} >= ${cutoff}`);
    const activeSet = new Set(activeUserIds.map(b => b.userId));

    const allUsers = await db.select().from(users);
    return allUsers.filter(u => !activeSet.has(u.id) && u.profileCompleted);
  }

  async getTopActiveUsers(limit: number): Promise<{ user: User; activityScore: number }[]> {
    const rows = await db.select({
      userId: bookings.userId,
      score: sql<number>`COUNT(*)`,
    }).from(bookings).groupBy(bookings.userId).orderBy(sql`COUNT(*) DESC`).limit(limit);

    const results: { user: User; activityScore: number }[] = [];
    for (const row of rows) {
      const [user] = await db.select().from(users).where(eq(users.id, row.userId));
      if (user) results.push({ user, activityScore: Number(row.score) });
    }
    return results;
  }
}

export const storage = new DatabaseStorage();