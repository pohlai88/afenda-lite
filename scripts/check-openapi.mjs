/**
 * Fail if OpenAPI YAML is missing, drifted from generate, or Spectral-invalid.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateOpenApiFile } from "../.cursor/skills/afenda-elite-doc-integrity/scripts/doc-integrity-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const yamlPath = join(root, "docs", "api", "OPEN-001-openapi.yaml");

function fail(message, code = 1) {
  console.error(`check:openapi: ${message}`);
  process.exit(code);
}

if (!existsSync(yamlPath)) {
  fail("missing docs/api/OPEN-001-openapi.yaml — run pnpm openapi:generate", 2);
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
    fail(`generate failed:\n${generate.stderr || generate.stdout}`, 2);
  }

  const committed = readFileSync(yamlPath, "utf8");
  const generated = readFileSync(generatedPath, "utf8");
  if (committed !== generated) {
    fail(
      "OPEN-001-openapi.yaml drifted from scripts/generate-openapi.mts — run pnpm openapi:generate and commit",
    );
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

let validation;
try {
  validation = await validateOpenApiFile(yamlPath, {
    afendaRules: false,
    spectralConfigPath: join(root, ".spectral.yaml"),
  });
} catch (error) {
  fail(`validator dependency or execution failure: ${error.message}`, 2);
}
if (!validation.complete) {
  fail("structured OpenAPI parsing or validation coverage was incomplete", 2);
}
if (validation.issues.length > 0) {
  for (const issue of validation.issues) console.error(`  - ${issue}`);
  fail("structured OpenAPI and Afenda contract validation failed");
}

console.log(
  `check:openapi: ok (${validation.operations} operations, ${validation.refs} references)`,
);
