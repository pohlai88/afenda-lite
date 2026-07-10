import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildRouteCoverageSnapshot,
  compareRouteCoverageSnapshots,
  type RouteCoverageSnapshot,
} from "../../lib/governance/portal-route-coverage";

const repoRoot = join(import.meta.dirname, "../..");
const snapshotPath = join(repoRoot, "docs/architecture/route-coverage.snapshot.json");

export function readRouteCoverageSnapshotFromDisk(
  path: string = snapshotPath,
): RouteCoverageSnapshot {
  return JSON.parse(readFileSync(path, "utf8")) as RouteCoverageSnapshot;
}

export function checkRouteCoverageDrift(input: {
  readonly liveSnapshot: RouteCoverageSnapshot;
  readonly snapshot: RouteCoverageSnapshot;
}): void {
  const result = compareRouteCoverageSnapshots(
    input.liveSnapshot,
    input.snapshot,
  );

  if (!result.ok) {
    throw new Error(result.message);
  }
}

async function main(): Promise<void> {
  const liveSnapshot = buildRouteCoverageSnapshot(repoRoot);
  const snapshot = readRouteCoverageSnapshotFromDisk();

  checkRouteCoverageDrift({ liveSnapshot, snapshot });

  if (liveSnapshot.summary.missing > 0) {
    const missing = liveSnapshot.routes
      .filter((row) => !row.presented)
      .map((row) => `  - ${row.routePattern} (${row.file})`)
      .join("\n");
    throw new Error(
      `Route coverage incomplete: ${liveSnapshot.summary.missing} product page(s) not presented in playground registry.\n${missing}\nAdd curated entries or rely on auto-discovery, then run: npm run export:route-coverage`,
    );
  }

  console.log("Route coverage snapshot check passed.");
  console.log(
    `Presented ${snapshot.summary.totalPresented}/${snapshot.summary.totalAvailable}`,
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
