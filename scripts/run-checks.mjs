import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * Docs-first checkout: only run gates whose scripts exist on disk.
 * Collapse-era product/ops gates are absent by design (ARCH-028 anti-contamination).
 */
const preferred = [
  "check:docs-naming",
  "check:module-quality",
  "check:doc-integrity",
  "check:openapi",
];

function scriptExists(npmScriptName) {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const cmd = pkg.scripts?.[npmScriptName];
  if (!cmd) return false;
  if (String(cmd).includes("collapse-script-unavailable.mjs")) return false;
  if (String(cmd).includes(".cursor/skills/")) return true;
  const m = String(cmd).match(/scripts\/([A-Za-z0-9._/-]+\.(?:mjs|mts))/);
  if (!m) return true;
  return fs.existsSync(path.join("scripts", m[1]));
}

const checks = preferred.filter(scriptExists);

function runCheck(script) {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", script], {
      stdio: "inherit",
      shell: true,
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }
      reject(new Error(`${script} failed with exit code ${code ?? "unknown"}`));
    });
  });
}

async function main() {
  if (checks.length === 0) {
    console.error("checks: no docs-capable gates available");
    process.exit(1);
  }
  await Promise.all(checks.map((script) => runCheck(script)));
  console.log(
    `checks OK (${checks.length} docs-capable gates; Collapse-era product gates skipped per ARCH-028)`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
