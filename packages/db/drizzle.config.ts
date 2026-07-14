import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config (ARCH-025 · ARCH-028 S2.2).
 * Migrations write under packages/db/drizzle/.
 * Requires DATABASE_URL for migrate / live checks (prefer Neon -pooler).
 */
const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  strict: true,
  verbose: true,
  ...(databaseUrl
    ? {
        dbCredentials: {
          url: databaseUrl,
        },
      }
    : {}),
});
