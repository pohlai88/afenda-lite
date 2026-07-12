/**
 * Feed Farm Trade tenancy helpers (ADR-002 hard cutover).
 * Additive organization_id only — does not merge FFT + platform permission catalogs.
 * backfill* remains for ops scripts only — not RSC forever-backfill.
 */

import "server-only";

import { pool } from "@/modules/platform/db";

export { organizationScopeSql } from "@/modules/platform/db/organization-scope";

const TENANT_TABLES = [
  "fft_event",
  "fft_sales_member",
  "fft_role",
  "fft_role_assignment",
] as const;

/** Ops-only stamp for remaining NULLs before NOT NULL. Idempotent. */
export async function backfillFftOrganizationIds(
  organizationId: string,
): Promise<{ updated: number }> {
  let updated = 0;
  for (const table of TENANT_TABLES) {
    const result = await pool.query(
      `UPDATE ${table}
       SET organization_id = $1
       WHERE organization_id IS NULL`,
      [organizationId],
    );
    updated += result.rowCount ?? 0;
  }
  return { updated };
}
