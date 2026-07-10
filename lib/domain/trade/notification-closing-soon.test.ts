import { describe, expect, it } from "vitest";
import {
  CLOSING_SOON_WINDOW_HOURS,
  closingSoonEntityId,
  isEventClosingSoon,
} from "@/lib/domain/trade/notification-closing-soon";

describe("isEventClosingSoon", () => {
  const closesAt = new Date("2026-07-11T12:00:00.000Z");

  it("returns true inside the window for open events", () => {
    const now = new Date("2026-07-11T00:00:00.000Z");
    expect(
      isEventClosingSoon({ status: "open", closesAt }, now, CLOSING_SOON_WINDOW_HOURS),
    ).toBe(true);
  });

  it("returns false when already closed", () => {
    const now = new Date("2026-07-12T00:00:00.000Z");
    expect(
      isEventClosingSoon({ status: "open", closesAt }, now, CLOSING_SOON_WINDOW_HOURS),
    ).toBe(false);
  });

  it("returns false when event is not open", () => {
    const now = new Date("2026-07-11T00:00:00.000Z");
    expect(
      isEventClosingSoon({ status: "closed", closesAt }, now, CLOSING_SOON_WINDOW_HOURS),
    ).toBe(false);
  });
});

describe("closingSoonEntityId", () => {
  it("builds stable idempotency entity ids", () => {
    const closesAt = new Date("2026-07-11T12:00:00.000Z");
    expect(closingSoonEntityId("evt-1", closesAt)).toBe(
      "evt-1:2026-07-11T12:00:00.000Z",
    );
  });
});
