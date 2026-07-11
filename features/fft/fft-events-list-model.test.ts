import { describe, expect, it } from "vitest";
import {
  applyFftEventListView,
  filterFftEvents,
  sortFftEvents,
  type FftEventListItem,
} from "@/features/fft/fft-events-list-model";

const events: FftEventListItem[] = [
  {
    id: "1",
    eventName: "Zebra Sale",
    eventCode: "Z-1",
    status: "open",
    isTemplate: false,
    opensAt: "2026-07-10T08:00:00.000Z",
    closesAt: "2026-07-10T12:00:00.000Z",
  },
  {
    id: "2",
    eventName: "Alpha Draft",
    eventCode: "A-1",
    status: "draft",
    isTemplate: true,
    opensAt: "2026-07-01T08:00:00.000Z",
    closesAt: "2026-07-01T12:00:00.000Z",
  },
  {
    id: "3",
    eventName: "Mid Open",
    eventCode: "M-1",
    status: "open",
    isTemplate: false,
    opensAt: "2026-07-05T08:00:00.000Z",
    closesAt: "2026-07-05T12:00:00.000Z",
  },
];

describe("trade-events-list-model (P2-AC-01)", () => {
  it("filters by status without dropping other open rows", () => {
    const result = filterFftEvents(events, {
      query: "",
      status: "open",
      templatesOnly: false,
    });
    expect(result.map((e) => e.id)).toEqual(["1", "3"]);
  });

  it("filters by query on name or code", () => {
    expect(
      filterFftEvents(events, {
        query: "alpha",
        status: "",
        templatesOnly: false,
      }).map((e) => e.id),
    ).toEqual(["2"]);
    expect(
      filterFftEvents(events, {
        query: "m-1",
        status: "",
        templatesOnly: false,
      }).map((e) => e.id),
    ).toEqual(["3"]);
  });

  it("filters templates only", () => {
    expect(
      filterFftEvents(events, {
        query: "",
        status: "",
        templatesOnly: true,
      }).map((e) => e.id),
    ).toEqual(["2"]);
  });

  it("sorts by name / status / opensAt", () => {
    expect(
      sortFftEvents(events, "eventName", "asc").map((e) => e.eventName),
    ).toEqual(["Alpha Draft", "Mid Open", "Zebra Sale"]);
    expect(
      sortFftEvents(events, "opensAt", "asc").map((e) => e.id),
    ).toEqual(["2", "3", "1"]);
    expect(
      sortFftEvents(events, "status", "desc").map((e) => e.status)[0],
    ).toBe("open");
  });

  it("applies filter then sort in one pass (client view)", () => {
    const view = applyFftEventListView(
      events,
      { query: "", status: "open", templatesOnly: false },
      "opensAt",
      "asc",
    );
    expect(view.map((e) => e.id)).toEqual(["3", "1"]);
  });
});
