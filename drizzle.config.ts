import { defineConfig } from "drizzle-kit";

// DATABASE_URL is only needed for Drizzle migrations (npm run db:push).
// At runtime, the app uses Insforge SDK for all database access.
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required for Drizzle migrations. " +
    "This is NOT needed for normal app operation (Insforge SDK handles database access). " +
    "Only set DATABASE_URL when running: npm run db:push"
  );
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
