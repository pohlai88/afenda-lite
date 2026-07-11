/**
 * Layer A inventory + Layer B DNA / surface contracts for FFT UI registry.
 * Complements Vitest: npm run check:fft-ui-registry
 */
import { auditUiRegistry } from "./lib/fft-ui-registry-inventory.mjs";

const result = auditUiRegistry(process.cwd());

if (!result.ok) {
  console.error("FFT UI registry audit FAILED");
  for (const err of result.errors) {
    console.error(` - ${err}`);
  }
  console.error(JSON.stringify(result.counts, null, 2));
  process.exit(1);
}

console.log(
  `FFT UI registry audit OK (${result.counts.primitives} primitives, ${result.counts.blocks} blocks, ${result.counts.components} products, ${result.counts.surfaces} surfaces)`,
);
