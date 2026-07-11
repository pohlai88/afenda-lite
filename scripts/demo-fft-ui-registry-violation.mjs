/**
 * Always exits 1 — proves Layer B DNA + metadata contracts can go red.
 * Usage: npm run check:fft-ui-registry:expect-fail
 */
import fs from "node:fs";
import path from "node:path";
import {
  evaluateDna,
  loadRegistry,
} from "./lib/fft-ui-registry-inventory.mjs";

const root = process.cwd();
const registry = loadRegistry(root);
const evt = registry.components.find((c) => c.reusableId === "FFT-UI-EVT-LIST");

if (!evt?.dna) {
  console.error("FFT-UI-EVT-LIST missing dna — registry misconfigured");
  process.exit(1);
}

const handRolledViolation = `
"use client";
import { FFT_NATIVE_SELECT_CLASS } from "@/features/fft/trade-form-controls";
import { applyTradeEventListView } from "@/features/fft/trade-events-list-model";

function toggleSort(key) {}
export function TradeEventsList() {
  return <select className={FFT_NATIVE_SELECT_CLASS} />;
}
`;

const dnaErrors = evaluateDna(handRolledViolation, evt.dna);
const metaNeedle = `@fft-dna ${evt.requiredBlockId}`;
const metaMissing = !handRolledViolation.includes(metaNeedle);

console.log("=== EXPECT FAIL: hand-rolled Events DNA ===");
console.log(`requiredBlockId: ${evt.requiredBlockId}`);
console.log(`metadata required: ${metaNeedle}`);
console.log(`metadata present: ${!metaMissing}`);
for (const err of dnaErrors) {
  console.log(`FAIL dna: ${err}`);
}
if (metaMissing) {
  console.log(`FAIL metadata: missing ${JSON.stringify(metaNeedle)}`);
}

const abs = path.join(root, evt.path);
const live = fs.readFileSync(abs, "utf8");
const liveDna = evaluateDna(live, evt.dna);
const liveMeta = live.includes(metaNeedle);

console.log("");
console.log("=== LIVE FILE (should be green after remake) ===");
console.log(`path: ${evt.path}`);
console.log(`dna errors: ${liveDna.length === 0 ? "none (PASS)" : liveDna.join("; ")}`);
console.log(`metadata: ${liveMeta ? "PASS" : "FAIL missing pragma"}`);

console.log("");
console.log(
  "This script always exits 1 so CI/agents see a real red gate for the violation fixture.",
);
process.exit(1);
