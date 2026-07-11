/**
 * Declarations tenancy helpers (ADR-002).
 * organization_id is stamped/filtered at the domain edge; adapters pass the Neon org id.
 */

import "server-only";

import { pool } from "@/modules/platform/db";

const TENANT_TABLES = [
  "surveys",
  "client_invitations",
  "client_profiles",
  "client_assignments",
] as const;

/**
 * Stamp NULL organization_id rows with the active portal org.
 * Idempotent — safe to call from org-admin RSC loaders.
 */
export async function backfillDeclarationOrganizationIds(
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
