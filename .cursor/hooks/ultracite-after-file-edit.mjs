/**
 * Cursor afterFileEdit hook — run Ultracite/Biome fix on the edited file only.
 *
 * Ultracite's default `npm run fix` (whole tree) is unsafe while legacy lint
 * debt remains. Scope to the edited path.
 *
 * Stdin: Cursor afterFileEdit JSON ({ file_path, edits, ... })
 * @see https://www.ultracite.ai/docs/ai/hooks
 * @see https://cursor.com/docs/hooks
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readHookPayload } from "./hook-stdin.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

const ALLOWED_EXT = new Set([
  ".css",
  ".cjs",
  ".graphql",
  ".html",
  ".js",
  ".json",
  ".jsonc",
  ".jsx",
  ".mjs",
  ".svelte",
  ".ts",
  ".tsx",
  ".vue",
]);

const payload = await readHookPayload();
const filePath = payload?.file_path;
if (!filePath || typeof filePath !== "string") {
  process.exit(0);
}

const ext = path.extname(filePath).toLowerCase();
if (!ALLOWED_EXT.has(ext)) {
  process.exit(0);
}

const ultraciteCli = path.join(
  root,
  "node_modules",
  "ultracite",
  "dist",
  "index.js"
);
const result = spawnSync(
  process.execPath,
  [ultraciteCli, "fix", "--skip=correctness/noUnusedImports", filePath],
  {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }
);

if (result.stdout) {
  process.stderr.write(result.stdout);
}
if (result.stderr) {
  process.stderr.write(result.stderr);
}

// Fail open: never block the agent on formatter noise.
process.exit(0);
