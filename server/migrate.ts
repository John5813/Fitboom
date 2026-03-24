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

    // Add any other columns or tables that were added incrementally:
    // Example: ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...
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
