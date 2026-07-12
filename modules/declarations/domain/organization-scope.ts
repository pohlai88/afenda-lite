/**
 * Declarations tenancy helpers (ADR-002 hard cutover).
 * organization_id is required on tenant roots after migration 027.
 * backfill* remains for ops scripts only — not RSC forever-backfill.
 */

import "server-only";

import { pool } from "@/modules/platform/db";

export { organizationScopeSql } from "@/modules/platform/db/organization-scope";

const TENANT_TABLES = [
  "surveys",
  "client_invitations",
  "client_profiles",
  "client_assignments",
] as const;

/** Ops-only stamp for remaining NULLs before NOT NULL. Idempotent. */
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
