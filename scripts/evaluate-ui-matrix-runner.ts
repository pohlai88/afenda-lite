import {
  UI_SURFACE_REGISTRY,
  uiEvaluationMatrix,
  STUDIO_IMPLEMENTATION_BY_SURFACE,
  getWinnerCandidate,
  getRecommendationStrength,
  getStudioImplementation,
  isWinnerAligned,
  getStudioAdoptionSummary,
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

if (registryIds.size === 0) {
  console.error("FAIL: UI_SURFACE_REGISTRY is empty");
  process.exit(1);
}

const implIds = Object.keys(STUDIO_IMPLEMENTATION_BY_SURFACE);
const implMissing = [...registryIds].filter(
  (id) => !implIds.includes(id),
);
if (implMissing.length > 0) {
  console.error("FAIL: surfaces missing from STUDIO_IMPLEMENTATION_BY_SURFACE:");
  for (const id of implMissing) console.error(`  - ${id}`);
  process.exit(1);
}

console.log("UI Evaluation Matrix — Shadcn Studio scoring\n");
console.log(
  "surfaceId".padEnd(28) +
    "winner".padEnd(26) +
    "score".padEnd(7) +
    "str".padEnd(6) +
    "impl".padEnd(18) +
    "ok".padEnd(4) +
    "gaps",
);
console.log("-".repeat(96));

let strong = 0;
let marginal = 0;
let tie = 0;

for (const row of uiEvaluationMatrix) {
  const winner = getWinnerCandidate(row);
  const strength = getRecommendationStrength(row);
  const impl = getStudioImplementation(row.surfaceId);
  const aligned = isWinnerAligned(row);

  if (strength === "strong") strong++;
  else if (strength === "marginal") marginal++;
  else tie++;

  console.log(
    row.surfaceId.padEnd(28) +
      row.winner.padEnd(26) +
      String(winner?.weightedTotal ?? "—").padEnd(7) +
      strength.slice(0, 4).padEnd(6) +
      (impl?.kind ?? "—").padEnd(18) +
      (aligned ? "yes" : "no").padEnd(4) +
      String(row.gaps.length),
  );
}

console.log("-".repeat(96));

const adoption = getStudioAdoptionSummary();
console.log(
  `Scoring: ${uiEvaluationMatrix.length} surfaces | strong: ${strong} | marginal: ${marginal} | tie: ${tie}`,
);
console.log(
  `Implementation: studio-installed: ${adoption.studioInstalled} | portal-wrapper: ${adoption.portalWrapper} | hardcoded: ${adoption.hardcoded} | neon: ${adoption.neonIntegrated}`,
);
console.log(
  `Alignment: ${adoption.winnerAligned}/${uiEvaluationMatrix.length} winners matched | needs registry install: ${adoption.needsRegistryInstall}`,
);
console.log(
  `PASS: all ${registryIds.size} surfaces scored and implementation-tracked.`,
);
