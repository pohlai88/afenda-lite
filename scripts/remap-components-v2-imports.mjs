/**
 * One-shot remapper: AdminCN template @/ imports → components-V2 platform-* paths.
 * Run: node scripts/remap-components-v2-imports.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("components-V2");

/** Longest-prefix-first replacements */
const RULES = [
  ["@/components/ui/", "@/components-V2/platform-components/ui/"],
  ["@/components/layout/", "@/components-V2/platform-components/layout/"],
  ["@/components/shared/", "@/components-V2/platform-components/shared/"],
  ["@/components/Providers", "@/components-V2/platform-components/Providers"],
  ["@/components/ThemeProvider", "@/components-V2/platform-components/ThemeProvider"],
  ["@/configs/", "@/components-V2/platform-config/"],
  ["@/contexts/", "@/components-V2/platform-context/"],
  ["@/hooks/", "@/components-V2/platform-hooks/"],
  ["@/views/", "@/components-V2/platform-views/"],
  ["@/types/", "@/components-V2/platform-types/"],
  ["@/store/", "@/components-V2/platform-stores/"],
  ["@/utils/", "@/components-V2/platform-utils/"],
  ["@/assets/", "@/components-V2/platform-assets/"],
  ["@/fake-db/", "@/components-V2/platform-fake-db/"],
  ["@/lib/utils", "@/components-V2/lib/utils"],
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?|mts|cts)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function remapSource(source) {
  let next = source;
  let hits = 0;
  for (const [from, to] of RULES) {
    if (!next.includes(from)) continue;
    const parts = next.split(from);
    hits += parts.length - 1;
    next = parts.join(to);
  }
  return { next, hits };
}

const files = walk(ROOT);
let changedFiles = 0;
let totalHits = 0;

for (const file of files) {
  const before = fs.readFileSync(file, "utf8");
  const { next, hits } = remapSource(before);
  if (hits === 0 || next === before) continue;
  fs.writeFileSync(file, next);
  changedFiles += 1;
  totalHits += hits;
}

console.log(
  JSON.stringify({ filesScanned: files.length, changedFiles, totalHits }, null, 2),
);
