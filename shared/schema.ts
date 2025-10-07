import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  credits: integer("credits").notNull().default(0),
  isAdmin: boolean("is_admin").notNull().default(false),
});

export const gyms = pgTable("gyms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(),
  credits: integer("credits").notNull(),
  distance: text("distance").notNull().default("0 km"),
  hours: text("hours").notNull().default("00:00 - 24:00"),
  imageUrl: text("image_url").notNull(),
  address: text("address").notNull(),
  description: text("description"),
  rating: integer("rating").notNull().default(5),
  facilities: text("facilities"),
  qrCode: text("qr_code"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const onlineClasses = pgTable("online_classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  category: text("category").notNull(),
  duration: text("duration").notNull(),
  instructor: text("instructor").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  videoUrl: text("video_url").notNull(),
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

export const insertUserSchema = createInsertSchema(users).omit({ id: true, credits: true, isAdmin: true });
export const insertGymSchema = createInsertSchema(gyms).omit({ id: true, createdAt: true });
export const insertOnlineClassSchema = createInsertSchema(onlineClasses).omit({ id: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertGym = z.infer<typeof insertGymSchema>;
export type Gym = typeof gyms.$inferSelect;
export type InsertOnlineClass = z.infer<typeof insertOnlineClassSchema>;
export type OnlineClass = typeof onlineClasses.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;