import { describe, expect, it } from "vitest";

import { validateRelianceCoverage } from "@/lib/governance/portal-reliance-mapping";
import {
  buildRelianceGraphSnapshot,
  compareRelianceGraphSnapshots,
} from "@/lib/governance/portal-reliance-graph";
import {
  collectTransitiveSourceFiles,
  libImportToDomainIds,
} from "@/lib/governance/portal-reliance-scan";

describe("portal reliance graph", () => {
  it("builds a non-empty graph from registries", () => {
    const snapshot = buildRelianceGraphSnapshot();

    expect(snapshot.nodes.length).toBeGreaterThan(20);
    expect(snapshot.edges.length).toBeGreaterThan(20);
    expect(snapshot.nodes.some((node) => node.id === "surface:client-join")).toBe(true);
    expect(
      snapshot.edges.some(
        (edge) =>
          edge.type === "consumes" &&
          edge.source === "surface:client-join" &&
          edge.target === "auth:email-otp",
      ),
    ).toBe(true);
  });

  it("detects snapshot drift", () => {
    const live = buildRelianceGraphSnapshot();
    const stale = {
      ...live,
      nodes: live.nodes.slice(1),
    };

    const result = compareRelianceGraphSnapshots(live, stale);
    expect(result.ok).toBe(false);
  });
});

describe("portal reliance coverage scan", () => {
  it("passes static coverage for the current repo", () => {
    const report = validateRelianceCoverage();
    expect(report.ok, report.issues.map((issue) => issue.message).join("\n")).toBe(true);
  });

  it("materializes declared vs discovered compare rows", () => {
    const report = validateRelianceCoverage();
    const join = report.mapping.surfaces.find((row) => row.surfaceId === "client-join");

    expect(join).toBeDefined();
    expect(join?.compare.declared.length).toBeGreaterThan(0);
    expect(join?.compare.discovered.length).toBeGreaterThan(0);
    expect(join?.compare.aligned.length).toBeGreaterThan(0);
  });

  it("maps lib imports to domain ids", () => {
    expect(libImportToDomainIds("@/lib/domain/clients")).toEqual(["domain:clients"]);
    expect(libImportToDomainIds("@/lib/auth/client")).toEqual([]);
  });

  it("walks component imports transitively from a page entry", () => {
    const files = collectTransitiveSourceFiles([
      "components/client/client-dashboard-acknowledgement.tsx",
    ]);

    expect(files.some((file) => file.includes("client-dashboard-acknowledgement.tsx"))).toBe(
      true,
    );
  });
});
