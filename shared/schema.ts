import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  telegramId: text("telegram_id").unique(),
  phone: text("phone").unique(),
  chatId: text("chat_id"),
  name: text("name"),
  age: integer("age"),
  gender: text("gender"),
  profileImageUrl: text("profile_image_url"),
  credits: integer("credits").notNull().default(0),
  creditExpiryDate: timestamp("credit_expiry_date"),
  isAdmin: boolean("is_admin").notNull().default(false),
  profileCompleted: boolean("profile_completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const adminSettings = pgTable("admin_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  settingKey: text("setting_key").notNull().unique(),
  settingValue: text("setting_value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const partnershipMessages = pgTable("partnership_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hallName: text("hall_name").notNull(),
  phone: text("phone").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const gyms = pgTable("gyms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  categories: text("categories").array().notNull().default(sql`ARRAY[]::text[]`),
  credits: integer("credits").notNull(),
  distance: text("distance").notNull().default("0 km"),
  hours: text("hours").notNull().default("00:00 - 24:00"),
  imageUrl: text("image_url").notNull(),
  images: text("images").array().notNull().default(sql`ARRAY[]::text[]`),
  address: text("address").notNull(),
  description: text("description"),
  rating: integer("rating").notNull().default(5),
  facilities: text("facilities"),
  qrCode: text("qr_code"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  ownerAccessCode: text("owner_access_code").unique(),
  closedDays: text("closed_days").array().notNull().default(sql`ARRAY[]::text[]`),
  totalEarnings: integer("total_earnings").notNull().default(0),
  currentDebt: integer("current_debt").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const gymVisits = pgTable("gym_visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gymId: varchar("gym_id").notNull(),
  visitorName: text("visitor_name").notNull(),
  visitorProfileImage: text("visitor_profile_image"),
  visitDate: timestamp("visit_date").notNull().defaultNow(),
  creditsUsed: integer("credits_used").notNull(),
  amountEarned: integer("amount_earned").notNull(),
});

export const gymPayments = pgTable("gym_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gymId: varchar("gym_id").notNull(),
  amount: integer("amount").notNull(),
  paymentDate: timestamp("payment_date").notNull().defaultNow(),
  notes: text("notes"),
});

export const videoCollections = pgTable("video_collections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull().default(0),
  isFree: boolean("is_free").notNull().default(false),
  thumbnailUrl: text("thumbnail_url").notNull(),
  categories: text("categories").array().notNull().default(sql`ARRAY[]::text[]`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const onlineClasses = pgTable("online_classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  collectionId: varchar("collection_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  categories: text("categories").array().notNull().default(sql`ARRAY[]::text[]`),
  duration: integer("duration").notNull(),
  instructor: text("instructor"),
  thumbnailUrl: text("thumbnail_url").notNull(),
  videoUrl: text("video_url").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
});

export const userPurchases = pgTable("user_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  collectionId: varchar("collection_id").notNull(),
  purchaseDate: timestamp("purchase_date").notNull().defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  gymId: varchar("gym_id").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  qrCode: text("qr_code").notNull(),
  isCompleted: boolean("is_completed").notNull().default(false),
  timeSlotId: varchar("time_slot_id"),
  scheduledStartTime: text("scheduled_start_time"),
  scheduledEndTime: text("scheduled_end_time"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const timeSlots = pgTable("time_slots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gymId: varchar("gym_id").notNull(),
  dayOfWeek: text("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  capacity: integer("capacity").notNull(),
  availableSpots: integer("available_spots").notNull(),
});

/**
 * Zalning haftalik ish vaqti.
 *
 * `gyms.hours` matn maydoni ("09:00 - 24:00") o'rniga keladi — u mashina
 * o'qiy oladigan shaklda emasdi va hech qayerda tekshirilmasdi.
 * `dayOfWeek`: 0 = Yakshanba ... 6 = Shanba (JS `Date.getDay()` bilan bir xil).
 */
export const gymHours = pgTable("gym_hours", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gymId: varchar("gym_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  openTime: text("open_time").notNull().default("09:00"),
  closeTime: text("close_time").notNull().default("22:00"),
  isClosed: boolean("is_closed").notNull().default(false),
}, (table) => ({
  gymDayUnique: uniqueIndex("gym_hours_gym_day_unique").on(table.gymId, table.dayOfWeek),
}));

/**
 * Aniq sanadagi istisnolar — bayram, ta'mir, "bu juma yopiq".
 * Haftalik jadvaldan ustun turadi.
 */
export const gymClosures = pgTable("gym_closures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gymId: varchar("gym_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  reason: text("reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  gymDateUnique: uniqueIndex("gym_closures_gym_date_unique").on(table.gymId, table.date),
}));

/**
 * Pik oynalar — zal o'z doimiy mijozlari bilan band bo'ladigan vaqtlar.
 *
 * `maxCapacity`:
 *   0  — FitBoom mijozlari bu oynada umuman bron qila olmaydi (standart)
 *   N  — oynada ko'pi bilan N ta FitBoom mijozi bron qila oladi
 *
 * Yangi pik oyna faqat KELGUSI bronlarga ta'sir qiladi; mavjud bronlar
 * bekor qilinmaydi (zal egasi bexosdan mijoz bronini buzib qo'ymasligi uchun).
 */
export const gymPeakWindows = pgTable("gym_peak_windows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gymId: varchar("gym_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  maxCapacity: integer("max_capacity").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Slot bandligi — SANA bo'yicha.
 *
 * `time_slots` haftalik shablon (dayOfWeek = "Dushanba"), lekin ilgari bandlik
 * `time_slots.available_spots` da bitta umumiy hisoblagichda saqlanardi.
 * Natijada "Dushanba 09:00" sloti butun tizimda bitta hisoblagichga ega edi:
 * 15 kishi bron qilgach, u BARCHA haftalar uchun abadiy to'lgan bo'lib qolardi.
 *
 * Endi har bir (slot, sana) juftligi uchun alohida hisoblagich yuritiladi.
 */
export const slotOccupancy = pgTable("slot_occupancy", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timeSlotId: varchar("time_slot_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  bookedCount: integer("booked_count").notNull().default(0),
}, (table) => ({
  slotDateUnique: uniqueIndex("slot_occupancy_slot_date_unique").on(table.timeSlotId, table.date),
}));

/**
 * Yuborilgan bildirishnomalar jurnali — dublikatning oldini oladi.
 *
 * Ilgari "kimga yuborildi" ro'yxati server xotirasida (Set) saqlanardi.
 * Har qayta ishga tushganda (deploy, crash, autoscale) ro'yxat bo'shab,
 * bir xil eslatma qayta yuborilardi. Ikkinchi instans qo'shilsa esa har biri
 * o'zi yuborardi.
 *
 * `UNIQUE(user_id, kind, ref_date)` tufayli yuborish har bir kalit uchun
 * bir martagina bo'ladi — necha instans ishlashidan qat'i nazar.
 */
export const notificationLog = pgTable("notification_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  kind: text("kind").notNull(),      // masalan: "credit_expiry_5d"
  refDate: text("ref_date").notNull(), // YYYY-MM-DD
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueKey: uniqueIndex("notification_log_unique").on(table.userId, table.kind, table.refDate),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  credits: true,
  isAdmin: true,
  profileCompleted: true,
  createdAt: true
}).extend({
  phone: z.string().regex(/^\+998\d{9}$/, "Telefon raqami +998XXXXXXXXX formatida bo'lishi kerak").optional(),
  telegramId: z.string().optional(),
  chatId: z.string().optional(),
  name: z.string().min(2, "Ism kamida 2 belgidan iborat bo'lishi kerak").optional(),
  age: z.number().min(10, "Yosh kamida 10 bo'lishi kerak").max(100, "Yosh 100 dan oshmasligi kerak").optional(),
  gender: z.enum(["Erkak", "Ayol"], { errorMap: () => ({ message: "Jinsni tanlang" }) }).optional(),
});

export const completeProfileSchema = z.object({
  name: z.string().min(2, "Ism kamida 2 belgidan iborat bo'lishi kerak"),
  age: z.number().min(10, "Yosh kamida 10 bo'lishi kerak").max(100, "Yosh 100 dan oshmasligi kerak"),
  gender: z.enum(["Erkak", "Ayol"], { errorMap: () => ({ message: "Jinsni tanlang" }) }),
});
export const insertGymSchema = createInsertSchema(gyms).omit({ id: true, createdAt: true, totalEarnings: true, currentDebt: true });
export const insertVideoCollectionSchema = createInsertSchema(videoCollections).omit({ id: true, createdAt: true });
export const insertOnlineClassSchema = createInsertSchema(onlineClasses).omit({ id: true });
export const insertUserPurchaseSchema = createInsertSchema(userPurchases).omit({ id: true, purchaseDate: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true });
export const insertTimeSlotSchema = createInsertSchema(timeSlots).omit({ id: true });

const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Vaqt HH:MM formatida bo'lishi kerak");
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Sana YYYY-MM-DD formatida bo'lishi kerak");

export const insertGymHoursSchema = createInsertSchema(gymHours).omit({ id: true }).extend({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: timeString,
  closeTime: timeString,
});

export const insertGymClosureSchema = createInsertSchema(gymClosures).omit({ id: true, createdAt: true }).extend({
  date: dateString,
  reason: z.string().max(200).optional().nullable(),
});

export const insertGymPeakWindowSchema = createInsertSchema(gymPeakWindows).omit({ id: true, createdAt: true }).extend({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: timeString,
  endTime: timeString,
  maxCapacity: z.number().int().min(0).max(1000).default(0),
});

/** Zal egasi haftalik jadvalni bitta so'rovda saqlaydi */
export const saveGymScheduleSchema = z.object({
  hours: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    openTime: timeString,
    closeTime: timeString,
    isClosed: z.boolean(),
  })).max(7),
  peakWindows: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: timeString,
    endTime: timeString,
    maxCapacity: z.number().int().min(0).max(1000).default(0),
  })).max(100),
}).refine(
  (data) => data.hours.every((h) => h.isClosed || h.openTime < h.closeTime),
  { message: "Ochilish vaqti yopilish vaqtidan oldin bo'lishi kerak" },
).refine(
  (data) => data.peakWindows.every((w) => w.startTime < w.endTime),
  { message: "Pik oyna boshlanishi tugashidan oldin bo'lishi kerak" },
);
export const insertAdminSettingSchema = createInsertSchema(adminSettings).omit({ id: true, updatedAt: true });
export const insertPartnershipMessageSchema = createInsertSchema(partnershipMessages).omit({ id: true, status: true, createdAt: true });
export const creditPayments = pgTable("credit_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  credits: integer("credits").notNull(),
  price: integer("price").notNull(),
  status: text("status").notNull().default("pending"),
  receiptUrl: text("receipt_url"),
  remainingAmount: integer("remaining_amount").notNull().default(0),
  telegramMessageId: integer("telegram_message_id"),
  adminChatId: text("admin_chat_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const loginCodes = pgTable("login_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  telegramId: text("telegram_id").notNull(),
  chatId: text("chat_id").notNull(),
  phone: text("phone").notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const gymRatings = pgTable("gym_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  gymId: varchar("gym_id").notNull(),
  bookingId: varchar("booking_id").notNull().unique(),
  rating: integer("rating").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCreditPaymentSchema = createInsertSchema(creditPayments).omit({ id: true, createdAt: true });
export const insertLoginCodeSchema = createInsertSchema(loginCodes).omit({ id: true, createdAt: true });
export const insertGymVisitSchema = createInsertSchema(gymVisits).omit({ id: true, visitDate: true });
export const insertGymPaymentSchema = createInsertSchema(gymPayments).omit({ id: true, paymentDate: true });
export const insertGymRatingSchema = createInsertSchema(gymRatings).omit({ id: true, createdAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertGym = z.infer<typeof insertGymSchema>;
export type Gym = typeof gyms.$inferSelect;
export type InsertVideoCollection = z.infer<typeof insertVideoCollectionSchema>;
export type VideoCollection = typeof videoCollections.$inferSelect;
export type InsertOnlineClass = z.infer<typeof insertOnlineClassSchema>;
export type OnlineClass = typeof onlineClasses.$inferSelect;
export type InsertUserPurchase = z.infer<typeof insertUserPurchaseSchema>;
export type UserPurchase = typeof userPurchases.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertTimeSlot = z.infer<typeof insertTimeSlotSchema>;
export type TimeSlot = typeof timeSlots.$inferSelect;
export type InsertGymHours = z.infer<typeof insertGymHoursSchema>;
export type GymHours = typeof gymHours.$inferSelect;
export type InsertGymClosure = z.infer<typeof insertGymClosureSchema>;
export type GymClosure = typeof gymClosures.$inferSelect;
export type InsertGymPeakWindow = z.infer<typeof insertGymPeakWindowSchema>;
export type GymPeakWindow = typeof gymPeakWindows.$inferSelect;
export type SlotOccupancy = typeof slotOccupancy.$inferSelect;
export type SaveGymSchedule = z.infer<typeof saveGymScheduleSchema>;
export type NotificationLog = typeof notificationLog.$inferSelect;
export type InsertAdminSetting = z.infer<typeof insertAdminSettingSchema>;
export type AdminSetting = typeof adminSettings.$inferSelect;
export type InsertPartnershipMessage = z.infer<typeof insertPartnershipMessageSchema>;
export type PartnershipMessage = typeof partnershipMessages.$inferSelect;
export type InsertGymVisit = z.infer<typeof insertGymVisitSchema>;
export type GymVisit = typeof gymVisits.$inferSelect;
export type InsertGymPayment = z.infer<typeof insertGymPaymentSchema>;
export type GymPayment = typeof gymPayments.$inferSelect;
export type InsertCreditPayment = z.infer<typeof insertCreditPaymentSchema>;
export type CreditPayment = typeof creditPayments.$inferSelect;
export type InsertLoginCode = z.infer<typeof insertLoginCodeSchema>;
export type LoginCode = typeof loginCodes.$inferSelect;
export type InsertGymRating = z.infer<typeof insertGymRatingSchema>;
export type GymRating = typeof gymRatings.$inferSelect;

export const adminExpenses = pgTable("admin_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  marketingSpend: integer("marketing_spend").notNull().default(0),
  operationalCosts: integer("operational_costs").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAdminExpenseSchema = createInsertSchema(adminExpenses).omit({ id: true, createdAt: true });
export type InsertAdminExpense = z.infer<typeof insertAdminExpenseSchema>;
export type AdminExpense = typeof adminExpenses.$inferSelect;

export type GymWithRating = Gym & {
  avgRating: number | null;
  ratingCount: number;
};

export const storedFiles = pgTable("stored_files", {
  name: varchar("name").primaryKey(),
  data: text("data").notNull(),
  contentType: varchar("content_type", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export type StoredFile = typeof storedFiles.$inferSelect;