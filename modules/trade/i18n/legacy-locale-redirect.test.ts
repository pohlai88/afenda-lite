import { describe, expect, it } from "vitest";
import { resolveLegacyTradeLocaleRedirect } from "@/modules/trade/i18n/legacy-locale-redirect";

describe("resolveLegacyTradeLocaleRedirect", () => {
  it("maps bare locale to /trade/events", () => {
    expect(resolveLegacyTradeLocaleRedirect("vi", undefined)).toBe(
      "/trade/events",
    );
    expect(resolveLegacyTradeLocaleRedirect("en", [])).toBe("/trade/events");
  });

  it("strips locale and keeps the rest of the path", () => {
    expect(
      resolveLegacyTradeLocaleRedirect("vi", [
        "admin",
        "events",
        "evt-1",
        "setup",
      ]),
    ).toBe("/trade/admin/events/evt-1/setup");
    expect(
      resolveLegacyTradeLocaleRedirect("en", ["events", "evt-1", "order"]),
    ).toBe("/trade/events/evt-1/order");
  });

  it("returns null for non-locale first segments", () => {
    expect(resolveLegacyTradeLocaleRedirect("admin", ["events"])).toBeNull();
    expect(resolveLegacyTradeLocaleRedirect("events", undefined)).toBeNull();
  });
});
