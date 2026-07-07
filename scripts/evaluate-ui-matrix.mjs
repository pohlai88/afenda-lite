#!/usr/bin/env node
/**
 * Validates ui-decision-matrix.ts covers every surface in UI_SURFACE_REGISTRY.
 * Run: npm run evaluate:ui-matrix
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runner = path.join(root, "scripts", "evaluate-ui-matrix-runner.ts");

try {
  execFileSync("npx", ["tsx", runner], { cwd: root, stdio: "inherit", shell: true });
} catch {
  process.exit(1);
}
