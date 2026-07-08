import pg from "pg";
import { getPgPoolConfig } from "../db-pool-config.mjs";
import { loadEnvFile, getEnv } from "./load-env.mjs";

/** E2E / doc-capture only — production clients must complete email-otp on /join. */
export async function markNeonAuthEmailVerified(email) {
  const env = loadEnvFile();
  const databaseUrl = getEnv("DATABASE_URL", env);
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new pg.Pool(getPgPoolConfig(databaseUrl));
  try {
    const result = await pool.query(
      `UPDATE neon_auth."user"
       SET "emailVerified" = true, "updatedAt" = NOW()
       WHERE lower(email) = lower($1)
       RETURNING id, email, "emailVerified"`,
      [email.trim()],
    );

    if (result.rowCount === 0) {
      throw new Error(`Neon Auth user not found for email: ${email}`);
    }

    return result.rows[0];
  } finally {
    await pool.end();
  }
}
