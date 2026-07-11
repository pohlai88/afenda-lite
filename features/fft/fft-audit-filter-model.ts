/** P2-AC-03 — client-side audit trail filter by actor/date (UI only; no new RBAC). */

export type FftAuditListItem = {
  id: string;
  createdAt: string; // ISO
  action: string;
  actorId: string;
};

export type FftAuditListFilters = {
  actorId: string; // "" = all
  fromDate: string; // YYYY-MM-DD or ""
  toDate: string; // YYYY-MM-DD or ""
};

function dayStartMs(yyyyMmDd: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) return null;
  const ms = Date.parse(`${yyyyMmDd}T00:00:00.000Z`);
  return Number.isFinite(ms) ? ms : null;
}

function dayEndMs(yyyyMmDd: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) return null;
  const ms = Date.parse(`${yyyyMmDd}T23:59:59.999Z`);
  return Number.isFinite(ms) ? ms : null;
}

export function listAuditActors(rows: FftAuditListItem[]): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    if (row.actorId) set.add(row.actorId);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function filterFftAuditRows(
  rows: FftAuditListItem[],
  filters: FftAuditListFilters,
): FftAuditListItem[] {
  const fromMs = filters.fromDate ? dayStartMs(filters.fromDate) : null;
  const toMs = filters.toDate ? dayEndMs(filters.toDate) : null;

  return rows.filter((row) => {
    if (filters.actorId && row.actorId !== filters.actorId) return false;
    const createdMs = Date.parse(row.createdAt);
    if (!Number.isFinite(createdMs)) return false;
    if (fromMs != null && createdMs < fromMs) return false;
    if (toMs != null && createdMs > toMs) return false;
    return true;
  });
}

export function toFftAuditListItems(
  rows: Array<{
    id?: string | number;
    created_at?: string | Date | null;
    action?: string | null;
    actor_id?: string | null;
  }>,
): FftAuditListItem[] {
  return rows.map((row, index) => {
    const created =
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at
          ? new Date(row.created_at).toISOString()
          : "";
    return {
      id: String(row.id ?? index),
      createdAt: Number.isFinite(Date.parse(created)) ? created : "",
      action: String(row.action ?? ""),
      actorId: String(row.actor_id ?? ""),
    };
  });
}
