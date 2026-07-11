import { describe, expect, it } from "vitest";

import {
  buildRouteCoverageSnapshot,
  compareRouteCoverageSnapshots,
  matchSurfaceIdForRoute,
} from "@/modules/platform/governance/portal-route-coverage";

describe("portal-route-coverage", () => {
  it("matches known surfaces for inventory routes", () => {
    expect(matchSurfaceIdForRoute("/dashboard")).toBe("admin-dashboard");
    expect(matchSurfaceIdForRoute("/client/declare/[id]")).toBe("client-declare");
    expect(matchSurfaceIdForRoute("/join")).toBe("client-join");
  });

  it("builds a coverage snapshot from inventory + playground registry", () => {
    const snapshot = buildRouteCoverageSnapshot();

    expect(snapshot.version).toBe("1.0.0");
    expect(snapshot.summary.totalAvailable).toBeGreaterThan(20);
    expect(snapshot.summary.totalPresented).toBeGreaterThan(0);
    expect(
      snapshot.summary.byPhase.some(
        (phase) => phase.phase === "hot-sales" && phase.available > 0,
      ),
    ).toBe(true);
  });

  it("detects snapshot drift", () => {
    const live = buildRouteCoverageSnapshot();
    const stale = {
      ...live,
      summary: {
        ...live.summary,
        missing: live.summary.missing + 1,
      },
    };

    const result = compareRouteCoverageSnapshots(live, stale);
    expect(result.ok).toBe(false);
  });
});
