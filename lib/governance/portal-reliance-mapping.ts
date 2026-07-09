import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  ACTION_DOMAIN_MATERIALIZATION,
  SURFACE_RELIANCE,
  type RelianceConsumerTarget,
} from "@/lib/governance/portal-reliance-registry";
import {
  AUTH_PATHNAME_TO_OPERATION,
  INTERNAL_ACTION_ALLOWLIST,
  LAYOUT_PROTECTED_ADMIN_SURFACES,
  AUTH_REDIRECT_ENTRY_SURFACES,
  SERVER_SIDE_AUTH_BY_SURFACE,
  SURFACE_ENTRY_POINTS,
  domainLoaderSatisfiedByEntryFile,
} from "@/lib/routing/surface-entry-points";
import { UI_SURFACE_REGISTRY } from "@/lib/governance/ui-decision-matrix";
import type { RelianceCoverageIssue } from "@/lib/governance/portal-reliance-scan";
import {
  collectTransitiveSourceFiles,
  extractLibImports,
  libImportToDomainIds,
  listExportedActionIds,
  readSource,
  scanDiscoveredTargetsForFiles,
  authPathnamePresent,
} from "@/lib/governance/portal-reliance-scan";

export const PORTAL_RELIANCE_MAPPING_VERSION = "1.0.0" as const;

export const RELIANCE_MAPPING_DRIFT_STALE_MESSAGE =
  "Reliance mapping snapshot is stale. Run: npm run export:reliance-mapping";

export type MappingCompareStatus = "aligned" | "drift";

export type MappingCompareBucket = {
  readonly declared: readonly string[];
  readonly discovered: readonly string[];
  readonly aligned: readonly string[];
  readonly declaredOnly: readonly string[];
  readonly discoveredOnly: readonly string[];
  /** Known exceptions (layout auth, auth-page-only, entry-file domain loaders). */
  readonly inherited: readonly string[];
  readonly status: MappingCompareStatus;
};

export type SurfaceRelianceMappingRow = {
  readonly surfaceId: string;
  readonly route: string | null;
  readonly mode: "source-scan" | "auth-pathname" | "missing-entry";
  readonly compare: MappingCompareBucket;
  readonly evidence: {
    readonly entryFiles: readonly string[];
    readonly scannedFiles: readonly string[];
  };
};

export type ActionDomainMappingRow = {
  readonly actionId: string;
  readonly file: string;
  readonly compare: MappingCompareBucket;
};

export type RelianceMappingSnapshot = {
  readonly version: typeof PORTAL_RELIANCE_MAPPING_VERSION;
  readonly generatedAt: string;
  readonly summary: {
    readonly surfaces: { readonly total: number; readonly aligned: number; readonly drift: number };
    readonly actions: { readonly total: number; readonly aligned: number; readonly drift: number };
    readonly orphanActions: readonly string[];
    readonly internalActions: readonly string[];
  };
  readonly surfaces: readonly SurfaceRelianceMappingRow[];
  readonly actions: readonly ActionDomainMappingRow[];
};

function consumerTargetKey(target: RelianceConsumerTarget): string {
  if (target.kind === "server-action") {
    return target.actionId;
  }
  if (target.kind === "auth-operation") {
    return target.operationId;
  }
  return target.domainId;
}

function sortUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort();
}

function compareBuckets(
  declared: readonly string[],
  discovered: readonly string[],
  inherited: readonly string[] = [],
  options?: { ignoreDiscoveredOnly?: boolean },
): MappingCompareBucket {
  const declaredSet = new Set(declared);
  const discoveredSet = new Set(discovered);
  const inheritedSet = new Set(inherited);

  const aligned = declared.filter((id) => discoveredSet.has(id) || inheritedSet.has(id));
  const declaredOnly = declared.filter((id) => !discoveredSet.has(id) && !inheritedSet.has(id));
  const discoveredOnly = [...discoveredSet].filter((id) => !declaredSet.has(id));

  const status: MappingCompareStatus =
    declaredOnly.length === 0 &&
    (options?.ignoreDiscoveredOnly === true || discoveredOnly.length === 0)
      ? "aligned"
      : "drift";

  return {
    declared: sortUnique(declared),
    discovered: sortUnique(discovered),
    aligned: sortUnique(aligned),
    declaredOnly: sortUnique(declaredOnly),
    discoveredOnly: sortUnique(discoveredOnly),
    inherited: sortUnique(inherited),
    status,
  };
}

function authOperationsFromPathnames(pathnames: readonly string[] | undefined): string[] {
  if (!pathnames) {
    return [];
  }

  return sortUnique(
    pathnames
      .map((pathname) => AUTH_PATHNAME_TO_OPERATION[pathname])
      .filter((value): value is string => Boolean(value)),
  );
}

function inheritedSurfaceTargets(surfaceId: string, declared: readonly string[]): string[] {
  const inherited: string[] = [];

  if (LAYOUT_PROTECTED_ADMIN_SURFACES.has(surfaceId)) {
    for (const target of declared) {
      if (target === "action:requireAdminSession") {
        inherited.push(target);
      }
    }
  }

  if (AUTH_REDIRECT_ENTRY_SURFACES.has(surfaceId)) {
    for (const target of declared) {
      if (target.startsWith("auth:")) {
        inherited.push(target);
      }
    }
  }

  for (const operationId of SERVER_SIDE_AUTH_BY_SURFACE[surfaceId] ?? []) {
    if (declared.includes(operationId)) {
      inherited.push(operationId);
    }
  }

  return inherited;
}

function inheritedDomainTargets(
  surfaceId: string,
  consumes: readonly RelianceConsumerTarget[],
  entryFiles: readonly string[],
): string[] {
  const inherited: string[] = [];

  for (const consumer of consumes) {
    if (
      consumer.kind === "domain-loader" &&
      domainLoaderSatisfiedByEntryFile(consumer.domainId, entryFiles)
    ) {
      inherited.push(consumer.domainId);
    }
  }

  return inherited;
}

export function buildRelianceMappingSnapshot(
  repoRoot: string = process.cwd(),
): RelianceMappingSnapshot {
  const routeBySurface = new Map(
    UI_SURFACE_REGISTRY.map((entry) => [entry.surfaceId, entry.route] as const),
  );

  const surfaceRows: SurfaceRelianceMappingRow[] = [];

  for (const surface of SURFACE_RELIANCE) {
    const entry = SURFACE_ENTRY_POINTS[surface.surfaceId];
    const declared = surface.consumes.map(consumerTargetKey);

    if (!entry) {
      surfaceRows.push({
        surfaceId: surface.surfaceId,
        route: routeBySurface.get(surface.surfaceId) ?? null,
        mode: "missing-entry",
        compare: compareBuckets(declared, []),
        evidence: { entryFiles: [], scannedFiles: [] },
      });
      continue;
    }

    const scannedFiles = collectTransitiveSourceFiles(entry.files, repoRoot);

    if (entry.authPageOnly) {
      const discovered = authOperationsFromPathnames(entry.authPathnames);
      surfaceRows.push({
        surfaceId: surface.surfaceId,
        route: routeBySurface.get(surface.surfaceId) ?? null,
        mode: "auth-pathname",
        compare: compareBuckets(declared, discovered),
        evidence: { entryFiles: [...entry.files], scannedFiles },
      });
      continue;
    }

    const discovered = scanDiscoveredTargetsForFiles(scannedFiles, repoRoot);
    const inherited = [
      ...inheritedSurfaceTargets(surface.surfaceId, declared),
      ...inheritedDomainTargets(surface.surfaceId, surface.consumes, entry.files),
      ...authOperationsFromPathnames(entry.authPathnames).filter((op) => declared.includes(op)),
    ];

    surfaceRows.push({
      surfaceId: surface.surfaceId,
      route: routeBySurface.get(surface.surfaceId) ?? null,
      mode: "source-scan",
      compare: compareBuckets(declared, discovered, inherited),
      evidence: { entryFiles: [...entry.files], scannedFiles },
    });
  }

  const actionRows: ActionDomainMappingRow[] = ACTION_DOMAIN_MATERIALIZATION.map((entry) => {
    const discoveredDomains = existsSync(join(repoRoot, entry.file))
      ? sortUnique(
          extractLibImports(readSource(repoRoot, entry.file)).flatMap((spec) =>
            libImportToDomainIds(spec),
          ),
        )
      : [];

    return {
      actionId: entry.actionId,
      file: entry.file,
      compare: compareBuckets([...entry.domains], discoveredDomains, [], {
        ignoreDiscoveredOnly: true,
      }),
    };
  });

  const materializedActionIds = new Set(
    ACTION_DOMAIN_MATERIALIZATION.map((entry) => entry.actionId),
  );
  const internalActionIds = new Set(
    INTERNAL_ACTION_ALLOWLIST.map((entry) => entry.actionId),
  );

  const exportedActions = listExportedActionIds(repoRoot);
  const orphanActions = exportedActions.filter(
    (actionId) => !materializedActionIds.has(actionId) && !internalActionIds.has(actionId),
  );

  const surfaceAligned = surfaceRows.filter((row) => row.compare.status === "aligned").length;
  const actionAligned = actionRows.filter((row) => row.compare.status === "aligned").length;

  return {
    version: PORTAL_RELIANCE_MAPPING_VERSION,
    generatedAt: new Date().toISOString(),
    summary: {
      surfaces: {
        total: surfaceRows.length,
        aligned: surfaceAligned,
        drift: surfaceRows.length - surfaceAligned,
      },
      actions: {
        total: actionRows.length,
        aligned: actionAligned,
        drift: actionRows.length - actionAligned,
      },
      orphanActions,
      internalActions: [...internalActionIds].sort(),
    },
    surfaces: surfaceRows,
    actions: actionRows,
  };
}

export function issuesFromRelianceMapping(
  mapping: RelianceMappingSnapshot,
  repoRoot: string = process.cwd(),
): RelianceCoverageIssue[] {
  const issues: RelianceCoverageIssue[] = [];

  for (const row of mapping.surfaces) {
    if (row.mode === "missing-entry") {
      issues.push({
        code: "missing-entry-point",
        message: `Surface "${row.surfaceId}" has no SURFACE_ENTRY_POINTS binding`,
      });
      continue;
    }

    for (const target of row.compare.declaredOnly) {
      if (target.startsWith("auth:")) {
        continue;
      }
      issues.push({
        code: "missing-declared-action",
        message: `Surface "${row.surfaceId}" declares ${target} but mapping found no matching source evidence`,
      });
    }

    for (const target of row.compare.discoveredOnly) {
      if (target.startsWith("action:")) {
        issues.push({
          code: "undeclared-action",
          message: `Surface "${row.surfaceId}" uses ${target} in source but SURFACE_RELIANCE omits it`,
        });
      }
    }

    if (row.mode === "auth-pathname") {
      const entry = SURFACE_ENTRY_POINTS[row.surfaceId];
      if (entry?.authPathnames) {
        const authSources = entry.files.map((file) => readSource(repoRoot, file)).join("\n");
        for (const pathname of entry.authPathnames) {
          if (!authPathnamePresent(authSources, pathname)) {
            issues.push({
              code: "missing-auth-pathname",
              message: `Surface "${row.surfaceId}" expects auth pathname "${pathname}" in source bindings`,
            });
          }
        }
      }
    } else if (entryAuthPathnames(row.surfaceId)) {
      const entry = SURFACE_ENTRY_POINTS[row.surfaceId];
      const authSources = entry.files
        .filter((file) => file.includes("auth") || file.includes("join"))
        .map((file) => readSource(repoRoot, file))
        .join("\n");

      for (const pathname of entry.authPathnames ?? []) {
        if (!authPathnamePresent(authSources, pathname)) {
          issues.push({
            code: "missing-auth-pathname",
            message: `Surface "${row.surfaceId}" expects auth pathname "${pathname}" in source bindings`,
          });
        }
      }
    }
  }

  for (const actionId of mapping.summary.orphanActions) {
    issues.push({
      code: "orphan-action-export",
      message: `${actionId} is exported from app/actions but missing from ACTION_DOMAIN_MATERIALIZATION and INTERNAL_ACTION_ALLOWLIST`,
    });
  }

  for (const row of mapping.actions) {
    for (const domainId of row.compare.declaredOnly) {
      issues.push({
        code: "missing-action-domain",
        message: `${row.actionId} declares ${domainId} but ${row.file} has no matching @/lib import`,
      });
    }
  }

  return issues;
}

function entryAuthPathnames(surfaceId: string): boolean {
  const entry = SURFACE_ENTRY_POINTS[surfaceId];
  return Boolean(entry?.authPathnames?.length);
}

export function compareRelianceMappingSnapshots(
  live: RelianceMappingSnapshot,
  snapshot: RelianceMappingSnapshot,
): { readonly ok: true } | { readonly ok: false; readonly message: string } {
  const normalize = (value: RelianceMappingSnapshot): unknown => ({
    actions: value.actions.map((row) => ({
      actionId: row.actionId,
      compare: row.compare,
      file: row.file,
    })),
    summary: {
      ...value.summary,
      internalActions: [...value.summary.internalActions],
      orphanActions: [...value.summary.orphanActions],
    },
    surfaces: value.surfaces.map((row) => ({
      compare: row.compare,
      evidence: {
        entryFiles: [...row.evidence.entryFiles],
        scannedFiles: [...row.evidence.scannedFiles],
      },
      mode: row.mode,
      route: row.route,
      surfaceId: row.surfaceId,
    })),
    version: value.version,
  });

  if (JSON.stringify(normalize(live)) !== JSON.stringify(normalize(snapshot))) {
    return { ok: false, message: RELIANCE_MAPPING_DRIFT_STALE_MESSAGE };
  }

  return { ok: true };
}

export function validateRelianceCoverage(repoRoot: string = process.cwd()) {
  const mapping = buildRelianceMappingSnapshot(repoRoot);
  const issues = issuesFromRelianceMapping(mapping, repoRoot);
  const scannedFiles = mapping.surfaces.reduce(
    (total, row) => total + row.evidence.scannedFiles.length,
    0,
  );

  return {
    ok: issues.length === 0,
    issues,
    mapping,
    scannedFiles,
    surfacesScanned: mapping.surfaces.length,
  };
}
