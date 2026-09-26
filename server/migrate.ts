import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import ws from "ws";
import { parseLegacyHours } from "@shared/schedule";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

// Ensure all tables that may have been added after initial migration exist
/**
 * Ba'zi DDL amallar allaqachon bajarilgan bo'lsa xato beradi — bu normal.
 * Lekin ilgari `.catch(() => {})` HAR QANDAY xatoni jim yutardi, shu sababli
 * haqiqiy muammolar ham ko'rinmay qolardi. Endi kamida log'ga yoziladi.
 */
async function tryDdl(client: any, label: string, sqlText: string) {
  try {
    await client.query(sqlText);
  } catch (err: any) {
    console.warn(`[migrate] "${label}" o'tkazib yuborildi: ${err.message}`);
  }
}

/**
 * Bir martalik ma'lumot ko'chirish.
 *
 * 1. `gyms.hours` matni va `closed_days` dan tarkibiy `gym_hours` yaratiladi.
 * 2. Mavjud bronlardan `slot_occupancy` to'ldiriladi.
 *
 * Ikkalasi ham idempotent: mavjud yozuvlar ustiga yozilmaydi, shuning uchun
 * har safar ishga tushishda xavfsiz qayta bajariladi.
 */
async function backfillSchedule(client: any) {
  // 1. Ish vaqti — faqat hali sozlanmagan zallar uchun
  const gymsNeedingHours = await client.query(`
    SELECT g.id, g.hours, g.closed_days
    FROM gyms g
    WHERE NOT EXISTS (SELECT 1 FROM gym_hours h WHERE h.gym_id = g.id)
  `);

  for (const gym of gymsNeedingHours.rows) {
    const { openTime, closeTime } = parseLegacyHours(gym.hours);
    const closedDays: string[] = gym.closed_days || [];
    for (let day = 0; day <= 6; day++) {
      await client.query(
        `INSERT INTO gym_hours (gym_id, day_of_week, open_time, close_time, is_closed)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (gym_id, day_of_week) DO NOTHING`,
        [gym.id, day, openTime, closeTime, closedDays.includes(String(day))],
      );
    }
  }
  if (gymsNeedingHours.rows.length > 0) {
    console.log(`[migrate] ${gymsNeedingHours.rows.length} ta zal uchun ish vaqti ko'chirildi`);
  }

  // 2. Slot bandligi — mavjud bronlardan hisoblab chiqiladi.
  //    Ilgari bandlik `time_slots.available_spots` da sanaga bog'lanmagan bitta
  //    hisoblagichda edi; endi har (slot, sana) uchun alohida hisoblanadi.
  const occupancyResult = await client.query(`
    INSERT INTO slot_occupancy (time_slot_id, date, booked_count)
    SELECT b.time_slot_id,
           split_part(b.date, 'T', 1) AS d,
           COUNT(*)
    FROM bookings b
    WHERE b.time_slot_id IS NOT NULL
      AND b.date IS NOT NULL
      AND b.status NOT IN ('cancelled', 'missed')
    GROUP BY b.time_slot_id, split_part(b.date, 'T', 1)
    ON CONFLICT (time_slot_id, date) DO NOTHING
  `);
  if (occupancyResult.rowCount) {
    console.log(`[migrate] ${occupancyResult.rowCount} ta (slot, sana) bandligi ko'chirildi`);
  }

  // 3. Buzilgan eski hisoblagichlarni tiklash.
  //    Eski model tufayli ko'p slotlar "abadiy to'lgan" holatda qolgan.
  const reset = await client.query(`
    UPDATE time_slots SET available_spots = capacity WHERE available_spots < capacity
  `);
  if (reset.rowCount) {
    console.log(`[migrate] ${reset.rowCount} ta slotning eski hisoblagichi tiklandi`);
  }
}

async function ensureTablesExist() {
  const client = await pool.connect();
  try {
    // admin_expenses — added after initial deployment
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_expenses (
        id SERIAL PRIMARY KEY,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        marketing_spend NUMERIC(12,2) NOT NULL DEFAULT 0,
        operational_costs NUMERIC(12,2) NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(month, year)
      )
    `);

    // stored_files — persistent file storage in DB (images, receipts)
    await client.query(`
      CREATE TABLE IF NOT EXISTS stored_files (
        name VARCHAR PRIMARY KEY,
        data TEXT NOT NULL,
        content_type VARCHAR(100) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // users jadvalidagi age, gender, name ustunlaridan NOT NULL olib tashlash
    await tryDdl(client, 'users NOT NULL olib tashlash', `
      ALTER TABLE users
        ALTER COLUMN age DROP NOT NULL,
        ALTER COLUMN gender DROP NOT NULL,
        ALTER COLUMN name DROP NOT NULL
    `);

    // gyms.category — eski NOT NULL o'chiriladi (categories array'ga o'tilgan)
    await tryDdl(client, 'gyms.category NOT NULL olib tashlash', `
      ALTER TABLE gyms ALTER COLUMN category DROP NOT NULL
    `);

    // video_collections.is_free — mavjud bo'lmasa qo'shiladi
    await tryDdl(client, 'video_collections.is_free qo\'shish', `
      ALTER TABLE video_collections ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT false
    `);

    // --- Jadval jadvallari (ish vaqti, yopiq sanalar, pik oynalar, bandlik) ---

    await client.query(`
      CREATE TABLE IF NOT EXISTS gym_hours (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        gym_id VARCHAR NOT NULL,
        day_of_week INTEGER NOT NULL,
        open_time TEXT NOT NULL DEFAULT '09:00',
        close_time TEXT NOT NULL DEFAULT '22:00',
        is_closed BOOLEAN NOT NULL DEFAULT false
      )
    `);
    await tryDdl(client, 'gym_hours unique index', `
      CREATE UNIQUE INDEX IF NOT EXISTS gym_hours_gym_day_unique ON gym_hours (gym_id, day_of_week)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS gym_closures (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        gym_id VARCHAR NOT NULL,
        date TEXT NOT NULL,
        reason TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await tryDdl(client, 'gym_closures unique index', `
      CREATE UNIQUE INDEX IF NOT EXISTS gym_closures_gym_date_unique ON gym_closures (gym_id, date)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS gym_peak_windows (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        gym_id VARCHAR NOT NULL,
        day_of_week INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        max_capacity INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS slot_occupancy (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        time_slot_id VARCHAR NOT NULL,
        date TEXT NOT NULL,
        booked_count INTEGER NOT NULL DEFAULT 0
      )
    `);
    await tryDdl(client, 'slot_occupancy unique index', `
      CREATE UNIQUE INDEX IF NOT EXISTS slot_occupancy_slot_date_unique ON slot_occupancy (time_slot_id, date)
    `);

    // Rozilik ustunlari — mavjud foydalanuvchilar uchun NULL bo'lib qoladi
    await tryDdl(client, 'users.terms_accepted_at', `
      ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP
    `);
    await tryDdl(client, 'users.terms_version', `
      ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version TEXT
    `);

    // Xatolar jurnali
    await client.query(`
      CREATE TABLE IF NOT EXISTS error_log (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        source TEXT NOT NULL,
        message TEXT NOT NULL,
        stack TEXT,
        context TEXT,
        user_id VARCHAR,
        fingerprint TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 1,
        resolved BOOLEAN NOT NULL DEFAULT false,
        first_seen TIMESTAMP NOT NULL DEFAULT NOW(),
        last_seen TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await tryDdl(client, 'error_log fingerprint unique', `
      CREATE UNIQUE INDEX IF NOT EXISTS error_log_fingerprint_unique ON error_log (fingerprint)
    `);
    await tryDdl(client, 'error_log last_seen index', `
      CREATE INDEX IF NOT EXISTS idx_error_log_last_seen ON error_log (last_seen DESC)
    `);

    // Yuborilgan bildirishnomalar jurnali — dublikatdan himoya
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_log (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        kind TEXT NOT NULL,
        ref_date TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await tryDdl(client, 'notification_log unique index', `
      CREATE UNIQUE INDEX IF NOT EXISTS notification_log_unique
        ON notification_log (user_id, kind, ref_date)
    `);

    await backfillSchedule(client);

    /**
     * Indekslar.
     *
     * Sxemada birorta index yo'q edi, holbuki deyarli har bir so'rov
     * user_id / gym_id bo'yicha filtrlaydi. IF NOT EXISTS tufayli bu qism
     * har safar xavfsiz qayta ishga tushadi.
     */
    const indexes: Array<[string, string]> = [
      ['idx_bookings_user_id', 'CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings (user_id)'],
      ['idx_bookings_gym_id', 'CREATE INDEX IF NOT EXISTS idx_bookings_gym_id ON bookings (gym_id)'],
      ['idx_bookings_status', 'CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status)'],
      ['idx_bookings_created_at', 'CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings (created_at)'],
      ['idx_time_slots_gym_id', 'CREATE INDEX IF NOT EXISTS idx_time_slots_gym_id ON time_slots (gym_id)'],
      ['idx_gym_visits_gym_id', 'CREATE INDEX IF NOT EXISTS idx_gym_visits_gym_id ON gym_visits (gym_id)'],
      ['idx_gym_payments_gym_id', 'CREATE INDEX IF NOT EXISTS idx_gym_payments_gym_id ON gym_payments (gym_id)'],
      ['idx_gym_ratings_gym_id', 'CREATE INDEX IF NOT EXISTS idx_gym_ratings_gym_id ON gym_ratings (gym_id)'],
      ['idx_gym_ratings_user_id', 'CREATE INDEX IF NOT EXISTS idx_gym_ratings_user_id ON gym_ratings (user_id)'],
      ['idx_user_purchases_user_id', 'CREATE INDEX IF NOT EXISTS idx_user_purchases_user_id ON user_purchases (user_id)'],
      ['idx_credit_payments_user_id', 'CREATE INDEX IF NOT EXISTS idx_credit_payments_user_id ON credit_payments (user_id)'],
      ['idx_credit_payments_status', 'CREATE INDEX IF NOT EXISTS idx_credit_payments_status ON credit_payments (status)'],
      ['idx_online_classes_collection_id', 'CREATE INDEX IF NOT EXISTS idx_online_classes_collection_id ON online_classes (collection_id)'],
      ['idx_login_codes_expires_at', 'CREATE INDEX IF NOT EXISTS idx_login_codes_expires_at ON login_codes (expires_at)'],
    ];
    for (const [label, ddl] of indexes) {
      await tryDdl(client, label, ddl);
    }

    await tryDdl(client, 'eski hal qilingan xatolarni tozalash', `
      DELETE FROM error_log WHERE resolved = true AND last_seen < NOW() - INTERVAL '30 days'
    `);

    await tryDdl(client, 'eski notification_log yozuvlarini tozalash', `
      DELETE FROM notification_log WHERE created_at < NOW() - INTERVAL '90 days'
    `);

    console.log("ensureTablesExist: all checks passed.");
  } finally {
    client.release();
  }
}

async function runMigrations() {
  console.log("Running migrations...");
  try {
    if (process.env.NODE_ENV === "production" && !process.env.SKIP_MIGRATIONS) {
      try {
        await migrate(db, { migrationsFolder: "./migrations" });
        console.log("Migrations completed successfully!");
      } catch (err: any) {
        if (err.message && err.message.includes("already exists")) {
          console.log("Some relations already exist — skipping drizzle migrate, continuing.");
        } else {
          throw err;
        }
      }
    } else {
      console.log("Skipping migrations in development or per SKIP_MIGRATIONS flag.");
    }

    // Always run these safety checks regardless of env
    await ensureTablesExist();
    process.exit(0);
  } catch (err: any) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

runMigrations();
