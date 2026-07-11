/** P2-AC-01 — client-side events list sort/filter (UI only; no domain writes). */

export type FftEventListItem = {
  id: string;
  eventName: string;
  eventCode: string;
  status: string;
  isTemplate: boolean;
  opensAt: string;
  closesAt: string;
};

export type FftEventSortKey = "eventName" | "status" | "opensAt";
export type FftEventSortDir = "asc" | "desc";

export type FftEventListFilters = {
  query: string;
  status: string; // "" = all
  templatesOnly: boolean;
};

export function filterFftEvents(
  events: FftEventListItem[],
  filters: FftEventListFilters,
): FftEventListItem[] {
  const q = filters.query.trim().toLowerCase();
  return events.filter((event) => {
    if (filters.templatesOnly && !event.isTemplate) return false;
    if (filters.status && event.status !== filters.status) return false;
    if (!q) return true;
    return (
      event.eventName.toLowerCase().includes(q) ||
      event.eventCode.toLowerCase().includes(q)
    );
  });
}

export function sortFftEvents(
  events: FftEventListItem[],
  sortKey: FftEventSortKey,
  sortDir: FftEventSortDir,
): FftEventListItem[] {
  const dir = sortDir === "asc" ? 1 : -1;
  return [...events].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "opensAt") {
      cmp = a.opensAt.localeCompare(b.opensAt);
    } else if (sortKey === "status") {
      cmp = a.status.localeCompare(b.status);
    } else {
      cmp = a.eventName.localeCompare(b.eventName, undefined, {
        sensitivity: "base",
      });
    }
    return cmp * dir;
  });
}

export function applyFftEventListView(
  events: FftEventListItem[],
  filters: FftEventListFilters,
  sortKey: FftEventSortKey,
  sortDir: FftEventSortDir,
): FftEventListItem[] {
  return sortFftEvents(filterFftEvents(events, filters), sortKey, sortDir);
}

export function toFftEventListItems(
  events: Array<{
    id: string;
    eventName: string;
    eventCode: string;
    status: string;
    isTemplate: boolean;
    opensAt: Date;
    closesAt: Date;
  }>,
): FftEventListItem[] {
  return events.map((event) => ({
    id: event.id,
    eventName: event.eventName,
    eventCode: event.eventCode,
    status: event.status,
    isTemplate: event.isTemplate,
    opensAt: event.opensAt.toISOString(),
    closesAt: event.closesAt.toISOString(),
  }));
}
