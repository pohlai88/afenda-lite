import { pathToFileURL } from "node:url";

import { validateRelianceCoverage } from "../../lib/governance/portal-reliance-mapping";

function printMappingTable(report: ReturnType<typeof validateRelianceCoverage>) {
  console.log("\nDeclared vs discovered (what we know):\n");
  console.log(
    `${"surfaceId".padEnd(28)} ${"status".padEnd(8)} declared  discovered  aligned  gaps`,
  );
  console.log("-".repeat(96));

  for (const row of report.mapping.surfaces) {
    const gaps =
      row.compare.declaredOnly.length + row.compare.discoveredOnly.length > 0
        ? `${row.compare.declaredOnly.length}+${row.compare.discoveredOnly.length}`
        : row.compare.inherited.length > 0
          ? `inh:${row.compare.inherited.length}`
          : "0";

    console.log(
      `${row.surfaceId.padEnd(28)} ${row.compare.status.padEnd(8)} ${String(row.compare.declared.length).padEnd(9)} ${String(row.compare.discovered.length).padEnd(11)} ${String(row.compare.aligned.length).padEnd(8)} ${gaps}`,
    );
  }
}

async function main(): Promise<void> {
  const report = validateRelianceCoverage();

  console.log("Reliance coverage validation\n");
  console.log(
    `Surfaces: ${report.surfacesScanned} · Files scanned: ${report.scannedFiles}`,
  );

  printMappingTable(report);

  if (report.ok) {
    console.log("\nReliance coverage check passed.");
    return;
  }

  for (const issue of report.issues) {
    console.error(`FAIL  [${issue.code}] ${issue.message}`);
  }

  console.error(`\nReliance coverage failed (${report.issues.length} issues)`);
  process.exit(1);
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
