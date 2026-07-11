import { describe, expect, it } from "vitest";
import {
  filterFftAuditRows,
  listAuditActors,
  toFftAuditListItems,
  type FftAuditListItem,
} from "@/features/fft/fft-audit-filter-model";

const rows: FftAuditListItem[] = [
  {
    id: "1",
    createdAt: "2026-07-09T10:00:00.000Z",
    action: "event.opened",
    actorId: "admin-1",
  },
  {
    id: "2",
    createdAt: "2026-07-10T15:30:00.000Z",
    action: "allocation.run",
    actorId: "ops-2",
  },
  {
    id: "3",
    createdAt: "2026-07-11T08:00:00.000Z",
    action: "order.completed",
    actorId: "admin-1",
  },
];

describe("trade-audit-filter-model (P2-AC-03)", () => {
  it("lists unique actors sorted", () => {
    expect(listAuditActors(rows)).toEqual(["admin-1", "ops-2"]);
  });

  it("filters by actor", () => {
    expect(
      filterFftAuditRows(rows, {
        actorId: "admin-1",
        fromDate: "",
        toDate: "",
      }).map((r) => r.id),
    ).toEqual(["1", "3"]);
  });

  it("filters by date range (inclusive UTC days)", () => {
    expect(
      filterFftAuditRows(rows, {
        actorId: "",
        fromDate: "2026-07-10",
        toDate: "2026-07-10",
      }).map((r) => r.id),
    ).toEqual(["2"]);
  });

  it("combines actor and date filters", () => {
    expect(
      filterFftAuditRows(rows, {
        actorId: "admin-1",
        fromDate: "2026-07-11",
        toDate: "",
      }).map((r) => r.id),
    ).toEqual(["3"]);
  });

  it("maps store rows to list items", () => {
    const mapped = toFftAuditListItems([
      {
        id: "a1",
        created_at: new Date("2026-07-09T10:00:00.000Z"),
        action: "event.cloned",
        actor_id: "u1",
      },
    ]);
    expect(mapped[0]).toMatchObject({
      id: "a1",
      action: "event.cloned",
      actorId: "u1",
    });
    expect(mapped[0]?.createdAt).toContain("2026-07-09");
  });
});
