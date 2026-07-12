/**
 * Hard organization tenancy SQL (ADR-002 hard cutover).
 * Tenant roots are NOT NULL after migration 027 — no soft (NULL OR org) dual-mode.
 */

export function organizationScopeSql(
  column: string,
  paramIndex: number,
): string {
  return `${column} = $${paramIndex}`;
}
