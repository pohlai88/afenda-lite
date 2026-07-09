import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { buildRelianceMappingSnapshot } from "../../lib/governance/portal-reliance-mapping";

const repoRoot = join(import.meta.dirname, "../..");
const snapshotPath = join(repoRoot, "docs/architecture/reliance-mapping.snapshot.json");

async function main(): Promise<void> {
  const mapping = buildRelianceMappingSnapshot(repoRoot);
  const serialized = `${JSON.stringify(mapping, null, 2)}\n`;

  mkdirSync(dirname(snapshotPath), { recursive: true });
  writeFileSync(snapshotPath, serialized, "utf8");

  console.log(`Wrote ${snapshotPath}`);
  console.log(
    `Surfaces ${mapping.summary.surfaces.aligned}/${mapping.summary.surfaces.total} aligned · Actions ${mapping.summary.actions.aligned}/${mapping.summary.actions.total} aligned`,
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
