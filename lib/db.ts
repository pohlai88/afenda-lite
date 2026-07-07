import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import {
  getDatabasePoolConfig,
  isPoolerConnection,
  normalizeDatabaseUrl,
} from "@/lib/db-config";

function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  return normalizeDatabaseUrl(url);
}

const databaseUrl = getDatabaseUrl();

if (
  process.env.NODE_ENV === "production" &&
  databaseUrl &&
  !isPoolerConnection(databaseUrl)
) {
  console.warn(
    "DATABASE_URL should use the Neon pooler host (-pooler) for serverless deployments.",
  );
}

const pool = new Pool(getDatabasePoolConfig(databaseUrl));
attachDatabasePool(pool);

export { pool, isPoolerConnection };

export async function checkDbConnection() {
  if (!process.env.DATABASE_URL) {
    return "No DATABASE_URL environment variable";
  }
  try {
    await pool.query("SELECT 1");
    return "Database connected";
  } catch (error) {
    console.error("Error connecting to the database:", error);
    return "Database not connected";
  }
}

export function getDatabaseConnectionMeta() {
  return {
    pooler: isPoolerConnection(process.env.DATABASE_URL),
    ssl: "verify-full",
  };
}
