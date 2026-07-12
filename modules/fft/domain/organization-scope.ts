/**
 * Feed Farm Trade tenancy helpers (ADR-002 follow-up).
 * Additive organization_id only — does not merge FFT + platform permission catalogs.
 */

import "server-only";

import { pool } from "@/modules/platform/db";

const TENANT_TABLES = [
  "fft_event",
  "fft_sales_member",
  "fft_role",
  "fft_role_assignment",
] as const;

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

/** SQL fragment: row belongs to org or is legacy-unscoped (pre-backfill). */
export function organizationScopeSql(
  column: string,
  paramIndex: number,
): string {
  return `(${column} IS NULL OR ${column} = $${paramIndex})`;
}
