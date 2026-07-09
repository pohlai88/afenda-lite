import { createHash } from "node:crypto";

import manifest from "@/lib/auth/neon-auth.manifest.json";
import {
  ACTION_DOMAIN_MATERIALIZATION,
  AUTH_OPERATION_DEFINITIONS,
  DOMAIN_MODULE_DEFINITIONS,
  PORTAL_CCP_DEFINITIONS,
  PORTAL_RELIANCE_GRAPH_VERSION,
  PORTAL_RELIANCE_SLICES,
  SURFACE_RELIANCE,
  UI_SYNC_SURFACE_CHECKS,
} from "@/lib/governance/portal-reliance-registry";
import { UI_SURFACE_REGISTRY } from "@/lib/governance/ui-decision-matrix";

export const RELIANCE_GRAPH_DRIFT_STALE_MESSAGE =
  "Reliance graph snapshot is stale. Run: npm run export:reliance-graph";

/** Surfaces materialized in validate-ui-sync but not in UI_SURFACE_REGISTRY. */
export const SYNTHETIC_SURFACE_IDS = new Set([
  "public-survey-link",
  "public-secure-link",
  "admin-survey-detail-playground",
  "client-declare-assignment",
  "client-declare-playground",
  "user-menu",
  "shell-dashboard",
  "data-integrity",
]);

export interface RelianceGraphNode {
  readonly id: string;
  readonly label: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly type:
    | "ui-surface"
    | "server-action"
    | "auth-operation"
    | "domain-module"
    | "gate"
    | "ccp";
}

export interface RelianceGraphEdge {
  readonly source: string;
  readonly target: string;
  readonly type: "consumes" | "materializes" | "validates";
}

export interface RelianceGraphSnapshot {
  readonly edges: readonly RelianceGraphEdge[];
  readonly fingerprint: string;
  readonly generatedAt: string;
  readonly nodes: readonly RelianceGraphNode[];
  readonly slices: readonly (typeof PORTAL_RELIANCE_SLICES)[number][];
  readonly version: typeof PORTAL_RELIANCE_GRAPH_VERSION;
}

function gateNodeId(gateCommand: string): string {
  return `gate:${gateCommand}`;
}

function addNode(nodes: RelianceGraphNode[], node: RelianceGraphNode): void {
  if (!nodes.some((entry) => entry.id === node.id)) {
    nodes.push(node);
  }
}

function addEdge(edges: RelianceGraphEdge[], edge: RelianceGraphEdge): void {
  const key = `${edge.type}:${edge.source}:${edge.target}`;
  if (!edges.some((entry) => `${entry.type}:${entry.source}:${entry.target}` === key)) {
    edges.push(edge);
  }
}

export function assertSurfaceRegistryCoverage(): void {
  const registryIds = new Set(UI_SURFACE_REGISTRY.map((entry) => entry.surfaceId));

  for (const entry of SURFACE_RELIANCE) {
    if (!registryIds.has(entry.surfaceId) && !SYNTHETIC_SURFACE_IDS.has(entry.surfaceId)) {
      throw new Error(
        `SURFACE_RELIANCE references unknown surfaceId "${entry.surfaceId}" — add to UI_SURFACE_REGISTRY or SYNTHETIC_SURFACE_IDS`,
      );
    }
  }
}

export function buildRelianceGraphSnapshot(): RelianceGraphSnapshot {
  assertSurfaceRegistryCoverage();

  const nodes: RelianceGraphNode[] = [];
  const edges: RelianceGraphEdge[] = [];
  const registryById = new Map(
    UI_SURFACE_REGISTRY.map((entry) => [entry.surfaceId, entry] as const),
  );

  for (const surface of UI_SURFACE_REGISTRY) {
    addNode(nodes, {
      id: `surface:${surface.surfaceId}`,
      label: surface.surfaceId,
      metadata: {
        domain: surface.domain,
        route: surface.route,
        currentComponent: surface.currentComponent,
      },
      type: "ui-surface",
    });
  }

  for (const syntheticId of SYNTHETIC_SURFACE_IDS) {
    addNode(nodes, {
      id: `surface:${syntheticId}`,
      label: syntheticId,
      metadata: { synthetic: true },
      type: "ui-surface",
    });
  }

  for (const domain of DOMAIN_MODULE_DEFINITIONS) {
    addNode(nodes, {
      id: domain.id,
      label: domain.label,
      metadata: { path: domain.path },
      type: "domain-module",
    });
  }

  for (const authOp of AUTH_OPERATION_DEFINITIONS) {
    addNode(nodes, {
      id: authOp.id,
      label: authOp.label,
      metadata: { method: authOp.method, path: authOp.path },
      type: "auth-operation",
    });
  }

  for (const action of ACTION_DOMAIN_MATERIALIZATION) {
    addNode(nodes, {
      id: action.actionId,
      label: action.actionId.replace(/^action:/, ""),
      metadata: { file: action.file },
      type: "server-action",
    });

    for (const domainId of action.domains) {
      addEdge(edges, {
        source: action.actionId,
        target: domainId,
        type: "materializes",
      });
    }
  }

  for (const entry of SURFACE_RELIANCE) {
    const surfaceNodeId = `surface:${entry.surfaceId}`;
    const meta = registryById.get(entry.surfaceId);

    if (meta) {
      addNode(nodes, {
        id: surfaceNodeId,
        label: entry.surfaceId,
        metadata: {
          domain: meta.domain,
          route: meta.route,
          currentComponent: meta.currentComponent,
        },
        type: "ui-surface",
      });
    }

    for (const consumer of entry.consumes) {
      if (consumer.kind === "server-action") {
        addEdge(edges, {
          source: surfaceNodeId,
          target: consumer.actionId,
          type: "consumes",
        });
      } else if (consumer.kind === "auth-operation") {
        addEdge(edges, {
          source: surfaceNodeId,
          target: consumer.operationId,
          type: "consumes",
        });
      } else {
        addEdge(edges, {
          source: surfaceNodeId,
          target: consumer.domainId,
          type: "consumes",
        });
      }
    }
  }

  addEdge(edges, {
    source: "surface:admin-issue-invite",
    target: "auth:organization/invite-member",
    type: "consumes",
  });

  for (const surfaceId of UI_SYNC_SURFACE_CHECKS) {
    addEdge(edges, {
      source: gateNodeId("check:ui-sync"),
      target: `surface:${surfaceId}`,
      type: "validates",
    });
  }

  for (const surface of UI_SURFACE_REGISTRY) {
    addEdge(edges, {
      source: gateNodeId("evaluate:ui-matrix"),
      target: `surface:${surface.surfaceId}`,
      type: "validates",
    });
  }

  for (const ccp of PORTAL_CCP_DEFINITIONS) {
    addNode(nodes, {
      id: ccp.id,
      label: ccp.id,
      metadata: { control: ccp.control, gateCommand: ccp.gateCommand },
      type: "ccp",
    });

    const gateId = gateNodeId(ccp.gateCommand);
    addNode(nodes, {
      id: gateId,
      label: ccp.gateCommand,
      metadata: { command: `npm run ${ccp.gateCommand}` },
      type: "gate",
    });

    addEdge(edges, {
      source: gateId,
      target: ccp.id,
      type: "validates",
    });
  }

  addEdge(edges, {
    source: gateNodeId("check:reliance-graph-drift"),
    target: "CCP-RG-001",
    type: "validates",
  });

  addEdge(edges, {
    source: gateNodeId("check:reliance-mapping-drift"),
    target: "CCP-RG-002",
    type: "validates",
  });

  addEdge(edges, {
    source: gateNodeId("check:reliance-coverage"),
    target: "CCP-RG-003",
    type: "validates",
  });

  addEdge(edges, {
    source: gateNodeId("audit:neon-auth-production"),
    target: "auth:organization/accept-invitation",
    type: "validates",
  });

  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        manifestSyncedAt: manifest.syncedAt ?? manifest.integration?.baseUrl ?? "",
        registrySurfaceCount: UI_SURFACE_REGISTRY.length,
        relianceSurfaceCount: SURFACE_RELIANCE.length,
        actionCount: ACTION_DOMAIN_MATERIALIZATION.length,
      }),
    )
    .digest("hex")
    .slice(0, 16);

  return {
    edges,
    fingerprint,
    generatedAt: new Date().toISOString(),
    nodes,
    slices: [...PORTAL_RELIANCE_SLICES],
    version: PORTAL_RELIANCE_GRAPH_VERSION,
  };
}

export function compareRelianceGraphSnapshots(
  live: RelianceGraphSnapshot,
  snapshot: RelianceGraphSnapshot,
): { readonly ok: true } | { readonly ok: false; readonly message: string } {
  const normalize = (value: RelianceGraphSnapshot): unknown => ({
    edges: [...value.edges].sort((a, b) =>
      `${a.type}:${a.source}:${a.target}`.localeCompare(`${b.type}:${b.source}:${b.target}`),
    ),
    fingerprint: value.fingerprint,
    nodes: [...value.nodes].sort((a, b) => a.id.localeCompare(b.id)),
    slices: [...value.slices].sort((a, b) => a.id.localeCompare(b.id)),
    version: value.version,
  });

  if (JSON.stringify(normalize(live)) !== JSON.stringify(normalize(snapshot))) {
    return { ok: false, message: RELIANCE_GRAPH_DRIFT_STALE_MESSAGE };
  }

  return { ok: true };
}
