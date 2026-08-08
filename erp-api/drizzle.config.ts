import 'dotenv/config';
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DB_URL!,
  },
  dialect: "postgresql",
  // verbose: true,
  // strict: true,
});

