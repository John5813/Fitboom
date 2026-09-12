import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import ws from "ws";

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
