import { describe, expect, it } from "vitest";

import { resolvePlaygroundStaticInspectGate } from "@/features/playground/playground-static-inspect";

describe("resolvePlaygroundStaticInspectGate", () => {
  it("returns condition for stub screens instead of inventing UI", () => {
    const result = resolvePlaygroundStaticInspectGate("client-dashboard");
    expect(result.kind).toBe("condition");
    if (result.kind === "condition") {
      expect(result.shape).toBe("stub");
      expect(result.screenId).toBe("client-dashboard");
    }
  });

  it("returns condition for closed trade screens", () => {
    const result = resolvePlaygroundStaticInspectGate("fft-trade-index");
    expect(result.kind).toBe("condition");
    if (result.kind === "condition") {
      // Declared closed; fixture-gap wins if trade path tokens are unset.
      expect(["closed", "fixture-gap"]).toContain(result.shape);
      expect(result.shape).not.toBe("live");
    }
  });

  it("returns live-embed-only for live screens without an RSC loader", () => {
    const result = resolvePlaygroundStaticInspectGate("auth-sign-in");
    expect(result.kind).toBe("live-embed-only");
    if (result.kind === "live-embed-only") {
      expect(result.shape).toBe("live");
    }
  });

  it("returns mount for allowlisted live screens", () => {
    const result = resolvePlaygroundStaticInspectGate("admin-dashboard");
    expect(result.kind).toBe("mount");
    if (result.kind === "mount") {
      expect(result.shape).toBe("live");
    }
  });
});
