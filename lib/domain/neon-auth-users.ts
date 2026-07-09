import "server-only";

import { pool } from "@/lib/db";
import { normalizeEmail } from "@/lib/domain/clients";

export type NeonAuthUserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
};

export async function getNeonAuthUserByEmail(
  email: string,
): Promise<NeonAuthUserRow | null> {
  const normalized = normalizeEmail(email);
  const result = await pool.query<NeonAuthUserRow>(
    `SELECT id, email, name, role
     FROM neon_auth."user"
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [normalized],
  );

  return result.rows[0] ?? null;
}
