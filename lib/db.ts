import "server-only";

import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import {
  getDatabasePoolConfig,
  isPoolerConnection,
  normalizeDatabaseUrl,
} from "@/lib/db-config";

type GlobalPoolState = typeof globalThis & {
  portalPgPool?: Pool;
};

function getDatabaseUrl(): string | undefined {
  // Read directly for pool bootstrap; full bag validated in instrumentation.ts via lib/env/server.
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  return normalizeDatabaseUrl(url);
}

function createPool(): Pool {
  const databaseUrl = getDatabaseUrl();

  if (
    process.env.NODE_ENV === "production" &&
    databaseUrl &&
    !isPoolerConnection(databaseUrl)
  ) {
    console.warn(
      "DATABASE_URL should use a pooler endpoint (-pooler host or port 6543) for serverless deployments.",
    );
  }

  const nextPool = new Pool(getDatabasePoolConfig(databaseUrl));

  if (process.env.VERCEL) {
    attachDatabasePool(nextPool);
  }

  return nextPool;
}

const globalForPool = globalThis as GlobalPoolState;
const pool = globalForPool.portalPgPool ?? createPool();
globalForPool.portalPgPool = pool;

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
