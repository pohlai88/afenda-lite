import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildRelianceGraphSnapshot,
  compareRelianceGraphSnapshots,
  type RelianceGraphSnapshot,
} from "../../lib/governance/portal-reliance-graph";

const repoRoot = join(import.meta.dirname, "../..");
const snapshotPath = join(repoRoot, "docs/architecture/reliance-graph.snapshot.json");

export function readRelianceGraphSnapshotFromDisk(
  path: string = snapshotPath,
): RelianceGraphSnapshot {
  return JSON.parse(readFileSync(path, "utf8")) as RelianceGraphSnapshot;
}

export function checkRelianceGraphDrift(input: {
  readonly liveSnapshot: RelianceGraphSnapshot;
  readonly snapshot: RelianceGraphSnapshot;
}): void {
  const result = compareRelianceGraphSnapshots(input.liveSnapshot, input.snapshot);

  if (!result.ok) {
    throw new Error(result.message);
  }
}

async function main(): Promise<void> {
  const liveSnapshot = buildRelianceGraphSnapshot();
  const snapshot = readRelianceGraphSnapshotFromDisk();

  checkRelianceGraphDrift({ liveSnapshot, snapshot });

  console.log("Reliance graph snapshot check passed.");
  console.log(`Nodes: ${snapshot.nodes.length} · Edges: ${snapshot.edges.length}`);
}

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
