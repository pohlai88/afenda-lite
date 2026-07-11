import { Client } from "pg";
import type { OperatorCreds } from "@/testing/e2e/credentials";

/**
 * Ensure the operator email is on the Feed Farm Trade allowlist so
 * `requireFftAccess` succeeds in @journey specs (SHARED_ADMIN is not
 * auto-seeded into fft_sales_member).
 */
export async function ensureTradeAllowlistForOperator(
  creds: OperatorCreds,
): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required to seed fft_sales_member for trade journeys",
    );
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(
      `INSERT INTO fft_sales_member (email, user_id, active)
       VALUES ($1, NULL, TRUE)
       ON CONFLICT (email) DO UPDATE SET active = TRUE`,
      [creds.email.trim().toLowerCase()],
    );
  } finally {
    await client.end();
  }
}
