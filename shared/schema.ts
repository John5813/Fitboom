import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  telegramId: text("telegram_id").unique(),
  phone: text("phone").unique(),
  chatId: integer("chat_id"),
  name: text("name"),
  age: integer("age"),
  gender: text("gender"),
  profileImageUrl: text("profile_image_url"),
  credits: integer("credits").notNull().default(0),
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
  address: text("address").notNull(),
  description: text("description"),
  rating: integer("rating").notNull().default(5),
  facilities: text("facilities"),
  qrCode: text("qr_code"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  credits: true,
  isAdmin: true,
  profileCompleted: true,
  createdAt: true
}).extend({
  phone: z.string().regex(/^\+998\d{9}$/, "Telefon raqami +998XXXXXXXXX formatida bo'lishi kerak").optional(),
  telegramId: z.string().optional(),
  chatId: z.number().optional(), // Added chatId here
  name: z.string().min(2, "Ism kamida 2 belgidan iborat bo'lishi kerak").optional(),
  age: z.number().min(10, "Yosh kamida 10 bo'lishi kerak").max(100, "Yosh 100 dan oshmasligi kerak").optional(),
  gender: z.enum(["Erkak", "Ayol"], { errorMap: () => ({ message: "Jinsni tanlang" }) }).optional(),
});

export const completeProfileSchema = z.object({
  name: z.string().min(2, "Ism kamida 2 belgidan iborat bo'lishi kerak"),
  age: z.number().min(10, "Yosh kamida 10 bo'lishi kerak").max(100, "Yosh 100 dan oshmasligi kerak"),
  gender: z.enum(["Erkak", "Ayol"], { errorMap: () => ({ message: "Jinsni tanlang" }) }),
});
export const insertGymSchema = createInsertSchema(gyms).omit({ id: true, createdAt: true });
export const insertVideoCollectionSchema = createInsertSchema(videoCollections).omit({ id: true, createdAt: true });
export const insertOnlineClassSchema = createInsertSchema(onlineClasses).omit({ id: true });
export const insertUserPurchaseSchema = createInsertSchema(userPurchases).omit({ id: true, purchaseDate: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true });
export const insertTimeSlotSchema = createInsertSchema(timeSlots).omit({ id: true });
export const insertAdminSettingSchema = createInsertSchema(adminSettings).omit({ id: true, updatedAt: true });
export const insertPartnershipMessageSchema = createInsertSchema(partnershipMessages).omit({ id: true, status: true, createdAt: true });

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
export type InsertAdminSetting = z.infer<typeof insertAdminSettingSchema>;
export type AdminSetting = typeof adminSettings.$inferSelect;
export type InsertPartnershipMessage = z.infer<typeof insertPartnershipMessageSchema>;
export type PartnershipMessage = typeof partnershipMessages.$inferSelect;