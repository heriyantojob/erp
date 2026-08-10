import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";
import * as schema from "./schema";
import logger from "../utils/logger";

dotenv.config();

if (!process.env.DB_URL) {
  throw new Error("Missing DB_URL environment variable");
}

export const poolConnection = new Pool({
  connectionString: process.env.DB_URL,
});

async function initDatabase() {
  try {
    const client = await poolConnection.connect();
    await client.query("SELECT 1");
    client.release();
    logger.info("Database connection successful");
  } catch (error: any) {
    logger.error({ err: error }, "Database connection failed");
    throw new Error("Failed to connect to the database");
  }
}

// Gunakan top-level await (jika environment mendukung, misalnya pakai module type: "module")
await initDatabase();

// Inisialisasi drizzle setelah koneksi berhasil
export const db = drizzle(poolConnection, { schema });
