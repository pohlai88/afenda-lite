import {
  listJourneyPhases,
  scanAppPageRoutes,
  type JourneyPhaseId,
  type PortalRouteInventoryEntry,
} from "@/lib/governance/portal-route-inventory";
import { buildRelianceGraphSnapshot } from "@/lib/governance/portal-reliance-graph";
import { UI_SURFACE_REGISTRY } from "@/lib/governance/ui-decision-matrix";
import {
  playgroundRouteFiles,
  playgroundScreenDefs,
  resolvePlaygroundRouteFile,
} from "@/lib/playground/playground-registry";

export const ROUTE_COVERAGE_SNAPSHOT_VERSION = "1.0.0" as const;

export type RouteRelianceStatus = "wired" | "untracked";

export type RouteCoverageRow = {
  file: string;
  routePattern: string;
  phase: JourneyPhaseId;
  presented: boolean;
  screenIds: string[];
  surfaceId: string | null;
  relianceStatus: RouteRelianceStatus;
  relianceEdges: Array<{
    type: string;
    target: string;
  }>;
};

export type RouteCoveragePhaseSummary = {
  phase: JourneyPhaseId;
  available: number;
  presented: number;
  missing: number;
};

export type RouteCoverageSnapshot = {
  version: typeof ROUTE_COVERAGE_SNAPSHOT_VERSION;
  generatedAt: string;
  summary: {
    totalAvailable: number;
    totalPresented: number;
    missing: number;
    byPhase: RouteCoveragePhaseSummary[];
  };
  routes: RouteCoverageRow[];
};

function normalizeRouteForMatch(route: string): string {
  return route.split("?")[0]?.replace(/\/+$/, "") || "/";
}

/**
 * Match an inventory route pattern to a UI_SURFACE_REGISTRY entry.
 * Prefers exact route match; falls back to dynamic-segment-aware prefix.
 */
export function matchSurfaceIdForRoute(routePattern: string): string | null {
  const normalized = normalizeRouteForMatch(routePattern);

  const exact = UI_SURFACE_REGISTRY.find(
    (entry) => normalizeRouteForMatch(entry.route) === normalized,
  );
  if (exact) {
    return exact.surfaceId;
  }

  // Dynamic segment equivalence: `/client/declare/[id]` ↔ registry `/client/declare/[id]`
  // Also accept registry routes that embed parenthetical notes.
  const dynamicMatch = UI_SURFACE_REGISTRY.find((entry) => {
    const registryRoute = normalizeRouteForMatch(entry.route.split(" ")[0] ?? entry.route);
    if (registryRoute === normalized) {
      return true;
    }
    // `/dashboard/[id]` style: compare segment shapes
    const a = normalized.split("/").filter(Boolean);
    const b = registryRoute.split("/").filter(Boolean);
    if (a.length !== b.length) {
      return false;
    }
    return a.every((seg, i) => {
      const other = b[i] ?? "";
      const dynA = seg.startsWith("[") && seg.endsWith("]");
      const dynB = other.startsWith("[") && other.endsWith("]");
      return seg === other || dynA || dynB;
    });
  });

  return dynamicMatch?.surfaceId ?? null;
}

/**
 * Collect unique page files covered by the curated playground registry.
 */
export function collectPresentedRouteFiles(): Map<string, string[]> {
  const presented = new Map<string, string[]>();

  for (const file of Object.values(playgroundRouteFiles)) {
    const existing = presented.get(file) ?? [];
    presented.set(file, existing);
  }

  for (const screen of playgroundScreenDefs) {
    const file =
      screen.routeFile ??
      resolvePlaygroundRouteFile(screen.path) ??
      null;
    if (!file) {
      continue;
    }
    const ids = presented.get(file) ?? [];
    if (!ids.includes(screen.id)) {
      ids.push(screen.id);
    }
    presented.set(file, ids);
  }

  return presented;
}

function buildPhaseSummaries(
  routes: RouteCoverageRow[],
): RouteCoveragePhaseSummary[] {
  return listJourneyPhases().map((phase) => {
    const phaseRoutes = routes.filter((row) => row.phase === phase);
    const presented = phaseRoutes.filter((row) => row.presented).length;
    return {
      phase,
      available: phaseRoutes.length,
      presented,
      missing: phaseRoutes.length - presented,
    };
  });
}

/**
 * Build presented-vs-available coverage snapshot with reliance-graph status.
 */
export function buildRouteCoverageSnapshot(
  rootDir: string = process.cwd(),
): RouteCoverageSnapshot {
  const inventory = scanAppPageRoutes(rootDir);
  const presentedMap = collectPresentedRouteFiles();
  const graph = buildRelianceGraphSnapshot();
  const surfaceNodeIds = new Set(
    graph.nodes
      .filter((node) => node.type === "ui-surface")
      .map((node) => node.id),
  );

  const routes: RouteCoverageRow[] = inventory.map(
    (entry: PortalRouteInventoryEntry) => {
      const screenIds = presentedMap.get(entry.file) ?? [];
      const presented = presentedMap.has(entry.file);
      const surfaceId = matchSurfaceIdForRoute(entry.routePattern);
      const surfaceNodeId = surfaceId ? `surface:${surfaceId}` : null;
      const wired =
        surfaceNodeId !== null && surfaceNodeIds.has(surfaceNodeId);
      const relianceEdges = surfaceNodeId
        ? graph.edges
            .filter((edge) => edge.source === surfaceNodeId)
            .map((edge) => ({ type: edge.type, target: edge.target }))
        : [];

      return {
        file: entry.file,
        routePattern: entry.routePattern,
        phase: entry.phase,
        presented,
        screenIds,
        surfaceId,
        relianceStatus: wired ? "wired" : "untracked",
        relianceEdges,
      };
    },
  );

  const totalAvailable = routes.length;
  const totalPresented = routes.filter((row) => row.presented).length;

  return {
    version: ROUTE_COVERAGE_SNAPSHOT_VERSION,
    generatedAt: new Date().toISOString(),
    summary: {
      totalAvailable,
      totalPresented,
      missing: totalAvailable - totalPresented,
      byPhase: buildPhaseSummaries(routes),
    },
    routes,
  };
}

export function compareRouteCoverageSnapshots(
  live: RouteCoverageSnapshot,
  snapshot: RouteCoverageSnapshot,
): { readonly ok: true } | { readonly ok: false; readonly message: string } {
  const normalize = (value: RouteCoverageSnapshot): unknown => ({
    version: value.version,
    summary: {
      totalAvailable: value.summary.totalAvailable,
      totalPresented: value.summary.totalPresented,
      missing: value.summary.missing,
      byPhase: [...value.summary.byPhase].sort((a, b) =>
        a.phase.localeCompare(b.phase),
      ),
    },
    routes: [...value.routes]
      .map((row) => ({
        file: row.file,
        routePattern: row.routePattern,
        phase: row.phase,
        presented: row.presented,
        screenIds: [...row.screenIds].sort(),
        surfaceId: row.surfaceId,
        relianceStatus: row.relianceStatus,
        relianceEdges: [...row.relianceEdges].sort((a, b) =>
          `${a.type}:${a.target}`.localeCompare(`${b.type}:${b.target}`),
        ),
      }))
      .sort((a, b) => a.file.localeCompare(b.file)),
  });

  if (JSON.stringify(normalize(live)) !== JSON.stringify(normalize(snapshot))) {
    return {
      ok: false,
      message:
        "Route coverage snapshot is stale. Run: npm run export:route-coverage",
    };
  }

  return { ok: true };
}
