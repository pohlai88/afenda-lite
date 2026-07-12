/**
 * Fail if OpenAPI YAML is missing, drifted from generate, or Spectral-invalid.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const yamlPath = join(root, "docs", "api", "OPEN-001-openapi.yaml");

function fail(message) {
  console.error(`check:openapi: ${message}`);
  process.exit(1);
}

if (!existsSync(yamlPath)) {
  fail("missing docs/api/OPEN-001-openapi.yaml — run npm run openapi:generate");
}

const dir = mkdtempSync(join(tmpdir(), "afenda-openapi-"));
const generatedPath = join(dir, "OPEN-001-openapi.yaml");

try {
  const generate = spawnSync("npx", ["tsx", "scripts/generate-openapi.mts"], {
    cwd: root,
    encoding: "utf8",
    shell: true,
    env: { ...process.env, OPENAPI_OUT: generatedPath },
  });
  if (generate.status !== 0) {
    fail(`generate failed:\n${generate.stderr || generate.stdout}`);
  }

  const committed = readFileSync(yamlPath, "utf8");
  const generated = readFileSync(generatedPath, "utf8");
  if (committed !== generated) {
    fail(
      "OPEN-001-openapi.yaml drifted from scripts/generate-openapi.mts — run npm run openapi:generate and commit",
    );
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

const spectral = spawnSync(
  "npx",
  ["spectral", "lint", "docs/api/OPEN-001-openapi.yaml", "-r", ".spectral.yaml"],
  { cwd: root, encoding: "utf8", shell: true },
);
process.stdout.write(spectral.stdout || "");
process.stderr.write(spectral.stderr || "");
if (spectral.status !== 0) {
  fail("Spectral lint failed");
}

console.log("check:openapi: ok");
