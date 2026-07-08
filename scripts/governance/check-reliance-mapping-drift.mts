import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildRelianceMappingSnapshot,
  compareRelianceMappingSnapshots,
  type RelianceMappingSnapshot,
} from "../../lib/portal-reliance-mapping";

const repoRoot = join(import.meta.dirname, "../..");
const snapshotPath = join(repoRoot, "docs/architecture/reliance-mapping.snapshot.json");

export function readRelianceMappingSnapshotFromDisk(
  path: string = snapshotPath,
): RelianceMappingSnapshot {
  return JSON.parse(readFileSync(path, "utf8")) as RelianceMappingSnapshot;
}

async function main(): Promise<void> {
  const live = buildRelianceMappingSnapshot(repoRoot);
  const snapshot = readRelianceMappingSnapshotFromDisk();
  const result = compareRelianceMappingSnapshots(live, snapshot);

  if (!result.ok) {
    throw new Error(result.message);
  }

  console.log("Reliance mapping snapshot check passed.");
  console.log(
    `Surfaces ${snapshot.summary.surfaces.aligned}/${snapshot.summary.surfaces.total} aligned · Actions ${snapshot.summary.actions.aligned}/${snapshot.summary.actions.total} aligned`,
  );
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
