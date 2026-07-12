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
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

function readPayload() {
  try {
    const raw = readFileSync(0, "utf8").trim();
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const payload = readPayload();
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
