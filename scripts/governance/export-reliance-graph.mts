import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { buildRelianceGraphSnapshot } from "../../lib/governance/portal-reliance-graph";

const repoRoot = join(import.meta.dirname, "../..");
const snapshotPath = join(repoRoot, "docs/architecture/reliance-graph.snapshot.json");

async function main(): Promise<void> {
  const snapshot = buildRelianceGraphSnapshot();
  const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;

  mkdirSync(dirname(snapshotPath), { recursive: true });
  writeFileSync(snapshotPath, serialized, "utf8");

  console.log(`Wrote ${snapshotPath}`);
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
