/**
 * Fail if any tsconfig*.json introduces TS 6–deprecated `baseUrl`.
 * Paths must be written relative to the tsconfig file (no baseUrl prefix).
 *
 * Authority: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html
 * (Deprecated: --baseUrl — removed as a look-up root in TS 7.0)
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const SKIP_DIR = new Set([
  "node_modules",
  ".git",
  ".next",
  ".turbo",
  "dist",
  "build",
  "coverage",
  "test-results",
  "playwright-report",
  "_reference",
]);

/** @type {string[]} */
const offenders = [];

/**
 * @param {string} dir
 */
function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (SKIP_DIR.has(name)) {
      continue;
    }
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(full);
      continue;
    }
    if (!/^tsconfig.*\.json$/i.test(name)) {
      continue;
    }
    const text = readFileSync(full, "utf8");
    // Match "baseUrl" as a JSON key (not comments — tsconfig is JSON / JSONC-ish).
    if (/"baseUrl"\s*:/.test(text)) {
      offenders.push(relative(root, full).replace(/\\/g, "/"));
    }
  }
}

walk(root);

if (offenders.length > 0) {
  console.error(
    "check-tsconfig-no-baseurl: FAIL — deprecated compilerOptions.baseUrl found:",
  );
  for (const rel of offenders) {
    console.error(`  - ${rel}`);
  }
  console.error(
    "Remove baseUrl and put the prefix on each paths entry (relative to the tsconfig file).",
  );
  console.error(
    "Example: \"@/testing/*\": [\"../testing/*\"] — do not use ignoreDeprecations to bury this.",
  );
  process.exit(1);
}

console.log("check-tsconfig-no-baseurl: ok (no baseUrl in tsconfig*.json)");
process.exit(0);
