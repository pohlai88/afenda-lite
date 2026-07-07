import {
  UI_SURFACE_REGISTRY,
  uiEvaluationMatrix,
  getWinnerCandidate,
  getRecommendationStrength,
} from "../lib/ui-decision-matrix";

const registryIds = new Set(UI_SURFACE_REGISTRY.map((s) => s.surfaceId));
const matrixIds = new Set(uiEvaluationMatrix.map((r) => r.surfaceId));

const missing = [...registryIds].filter((id) => !matrixIds.has(id));
const extra = [...matrixIds].filter((id) => !registryIds.has(id));

if (missing.length > 0) {
  console.error("FAIL: surfaces missing from uiEvaluationMatrix:");
  for (const id of missing) console.error(`  - ${id}`);
  process.exit(1);
}

if (extra.length > 0) {
  console.error("FAIL: unknown surfaceIds in uiEvaluationMatrix:");
  for (const id of extra) console.error(`  - ${id}`);
  process.exit(1);
}

if (registryIds.size !== 34) {
  console.error(`FAIL: expected 34 surfaces in registry, got ${registryIds.size}`);
  process.exit(1);
}

console.log("UI Evaluation Matrix — summary\n");
console.log(
  "surfaceId".padEnd(32) +
    "winner".padEnd(28) +
    "score".padEnd(8) +
    "strength".padEnd(12) +
    "gaps",
);
console.log("-".repeat(90));

let strong = 0;
let marginal = 0;
let tie = 0;

for (const row of uiEvaluationMatrix) {
  const winner = getWinnerCandidate(row);
  const strength = getRecommendationStrength(row);
  if (strength === "strong") strong++;
  else if (strength === "marginal") marginal++;
  else tie++;

  console.log(
    row.surfaceId.padEnd(32) +
      row.winner.padEnd(28) +
      String(winner?.weightedTotal ?? "—").padEnd(8) +
      strength.padEnd(12) +
      String(row.gaps.length),
  );
}

console.log("-".repeat(90));
console.log(
  `Total: ${uiEvaluationMatrix.length} surfaces | strong: ${strong} | marginal: ${marginal} | tie: ${tie}`,
);
console.log("PASS: no omissions — all 34 surfaces scored.");
