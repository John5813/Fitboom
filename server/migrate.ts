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
