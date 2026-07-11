import { describe, expect, it } from "vitest";
import { resolveLegacyFftLocaleRedirect } from "@/modules/fft/i18n/legacy-locale-redirect";

describe("resolveLegacyFftLocaleRedirect", () => {
  it("maps bare locale to /fft/events", () => {
    expect(resolveLegacyFftLocaleRedirect("vi", undefined)).toBe(
      "/fft/events",
    );
    expect(resolveLegacyFftLocaleRedirect("en", [])).toBe("/fft/events");
  });

  it("strips locale and keeps the rest of the path", () => {
    expect(
      resolveLegacyFftLocaleRedirect("vi", [
        "admin",
        "events",
        "evt-1",
        "setup",
      ]),
    ).toBe("/fft/admin/events/evt-1/setup");
    expect(
      resolveLegacyFftLocaleRedirect("en", ["events", "evt-1", "order"]),
    ).toBe("/fft/events/evt-1/order");
  });

  it("returns null for non-locale first segments", () => {
    expect(resolveLegacyFftLocaleRedirect("admin", ["events"])).toBeNull();
    expect(resolveLegacyFftLocaleRedirect("events", undefined)).toBeNull();
  });
});
