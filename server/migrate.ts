import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const { Pool } = pg;

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL or SUPABASE_DATABASE_URL is not set");
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const db = drizzle(pool);

async function runMigrations() {
  console.log("Running migrations...");
  try {
    if (process.env.NODE_ENV === "production" && !process.env.SKIP_MIGRATIONS) {
      await migrate(db, { migrationsFolder: "./migrations" });
      console.log("Migrations completed successfully!");
    } else {
      console.log("Skipping migrations in development or per SKIP_MIGRATIONS flag.");
    }
    process.exit(0);
  } catch (err: any) {
    console.error("Migration failed:", err);
    if (err.message && err.message.includes("already exists")) {
      console.log("Relation already exists, treating as success.");
      process.exit(0);
    }
    process.exit(1);
  }
}

runMigrations();
