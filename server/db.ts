import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// DATABASE_URL is optional — the app uses Insforge SDK for all database operations.
// This module is only needed if you run Drizzle migrations (db:push) or use the legacy DatabaseStorage.
if (!process.env.DATABASE_URL) {
  console.warn(
    "[DB] DATABASE_URL is not set. This is fine — the app uses Insforge SDK for database access. " +
    "Only set DATABASE_URL if you need to run Drizzle migrations (npm run db:push).",
  );
}

export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : (null as unknown as pg.Pool);

export const db = process.env.DATABASE_URL
  ? drizzle(pool, { schema })
  : (null as any);
