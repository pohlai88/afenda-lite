#!/usr/bin/env node
/**
 * Extract Tailwind-like class tokens from source and compare to compiled CSS output.
 * Run: npx @tailwindcss/cli -i app/globals.css -o .tmp-audit.css && node scripts/audit-tailwind-classes.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CSS_PATH = path.join(ROOT, ".tmp-audit.css");
const SCAN_DIRS = ["app", "components", "lib", "stories"];

if (!fs.existsSync(CSS_PATH)) {
  console.error("Missing .tmp-audit.css — run: npx @tailwindcss/cli -i app/globals.css -o .tmp-audit.css");
  process.exit(1);
}

const compiledCss = fs.readFileSync(CSS_PATH, "utf8");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const sourceFiles = SCAN_DIRS.flatMap((d) => {
  const full = path.join(ROOT, d);
  return fs.existsSync(full) ? walk(full) : [];
});

const classPattern =
  /className\s*=\s*(?:cn\([^)]*\)|["'`][^"'`]*["'`]|{`[^`]*`})/gs;
const tokenPattern =
  /(?:^|\s)(!?[\w[\]:/().,%#*-]+(?:[:/][\w[\]:/().,%#*-]+)*)/g;

const SKIP_PREFIXES = new Set([
  "cn(",
  "{",
  "}",
  "(",
  ")",
  ",",
  '"',
  "'",
  "`",
]);

function extractClasses(content) {
  const found = new Set();
  const matches = content.matchAll(/className\s*=\s*{?[`"']([^`"']+)[`"']}?/g);
  for (const m of matches) {
    for (const token of m[1].split(/\s+/)) {
      if (token && !token.includes("${")) found.add(token);
    }
  }
  const cnMatches = content.matchAll(/cn\(\s*([^)]{1,2000})\)/gs);
  for (const m of cnMatches) {
    const parts = m[1].match(/["'`]([^"'`]+)["'`]/g) ?? [];
    for (const part of parts) {
      const inner = part.slice(1, -1);
      for (const token of inner.split(/\s+/)) {
        if (token) found.add(token);
      }
    }
  }
  return found;
}

const allClasses = new Set();
for (const file of sourceFiles) {
  const content = fs.readFileSync(file, "utf8");
  for (const c of extractClasses(content)) allClasses.add(c);
}

function utilityLikelyPresent(cls) {
  if (!cls || cls.startsWith("dark:") || cls.startsWith("sm:") || cls.startsWith("md:") ||
      cls.startsWith("lg:") || cls.startsWith("xl:") || cls.startsWith("2xl:") ||
      cls.startsWith("hover:") || cls.startsWith("focus:") || cls.startsWith("focus-visible:") ||
      cls.startsWith("active:") || cls.startsWith("disabled:") || cls.startsWith("aria-") ||
      cls.startsWith("data-") || cls.startsWith("group-") || cls.startsWith("peer-") ||
      cls.startsWith("[&") || cls.startsWith("*:") || cls.startsWith("**:data") ||
      cls.startsWith("has-") || cls.startsWith("supports-") || cls.startsWith("@")) {
    return "variant";
  }
  if (cls.startsWith("portal-") && !cls.includes(":")) {
    return compiledCss.includes(`.${cls}`) || compiledCss.includes(`${cls}{`) ? "component" : "missing-component";
  }
  const escaped = cls.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (compiledCss.includes(`.${escaped}`) || compiledCss.includes(`.\\${cls}`)) return "ok";
  if (compiledCss.includes(escaped)) return "ok";
  return "missing";
}

const missing = [];
const missingComponents = [];
const variantOnly = [];

for (const cls of [...allClasses].sort()) {
  const status = utilityLikelyPresent(cls);
  if (status === "missing") missing.push(cls);
  if (status === "missing-component") missingComponents.push(cls);
  if (status === "variant") variantOnly.push(cls);
}

console.log(`Scanned ${sourceFiles.length} files, ${allClasses.size} unique class tokens`);
console.log(`Compiled CSS size: ${compiledCss.length} bytes\n`);

console.log("=== MISSING COMPONENT CLASSES (portal-*) ===");
for (const c of missingComponents) console.log(" ", c);

console.log("\n=== LIKELY MISSING UTILITIES (sample, non-variant) ===");
const interesting = missing.filter(
  (c) =>
    !c.includes("${") &&
    !c.startsWith("[") &&
    !c.includes("group-data") &&
    !c.includes("data-[") &&
    !c.includes("**:data") &&
    !c.includes("&") &&
    !c.includes("*:") &&
    !c.includes("has-data") &&
    !c.includes("not-aria") &&
    !c.includes("not-data") &&
    !c.includes("in-data") &&
    !c.includes("[[") &&
    c.length < 80,
);
for (const c of interesting.slice(0, 80)) console.log(" ", c);
if (interesting.length > 80) console.log(`  ... and ${interesting.length - 80} more`);

console.log(`\nTotal missing (heuristic): ${missing.length}`);
console.log(`Missing portal component classes: ${missingComponents.length}`);
