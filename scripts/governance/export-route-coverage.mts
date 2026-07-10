import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { buildRouteCoverageSnapshot } from "../../lib/governance/portal-route-coverage";

const repoRoot = join(import.meta.dirname, "../..");
const snapshotPath = join(repoRoot, "docs/architecture/route-coverage.snapshot.json");

async function main(): Promise<void> {
  const snapshot = buildRouteCoverageSnapshot(repoRoot);
  const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;

  mkdirSync(dirname(snapshotPath), { recursive: true });
  writeFileSync(snapshotPath, serialized, "utf8");

  console.log(`Wrote ${snapshotPath}`);
  console.log(
    `Presented ${snapshot.summary.totalPresented}/${snapshot.summary.totalAvailable} · missing ${snapshot.summary.missing}`,
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
