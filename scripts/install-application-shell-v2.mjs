#!/usr/bin/env node
/**
 * Refresh Shadcn Studio application-shell-05 **chrome primitives** only.
 *
 * Does NOT overwrite composable shell files (hand-maintained):
 * - application-shell-05-page.tsx
 * - application-shell-05-layout.tsx
 * - application-shell-05-sidebar.tsx
 * - types.ts, shell-render-link.tsx, sidebar-user-dropdown.tsx
 *
 * Run: node scripts/install-application-shell-v2.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseEnvFile } from "./lib/env-files.mjs";

const api = parseEnvFile("env.secret").SHADCN_STUDIO_API_KEY;
const email = parseEnvFile("env.config").EMAIL;

if (!api || !email) {
  console.error("Missing SHADCN_STUDIO_API_KEY or EMAIL");
  process.exit(1);
}

const url =
  `https://shadcnstudio.com/r/blocks/base-nova/application-shell-05.json` +
  `?license_key=${encodeURIComponent(api)}&email=${encodeURIComponent(email)}`;

const res = await fetch(url, {
  headers: { "x-license-key": api, "x-email": email },
});

if (!res.ok) {
  console.error(`Failed to fetch block (${res.status})`);
  process.exit(1);
}

const block = await res.json();
const targetDir = "components/shadcn-studio/blocks";
const root = process.cwd();

const chromeFiles = new Set([
  "dialog-activity.tsx",
  "dialog-search.tsx",
  "dropdown-language.tsx",
  "dropdown-notification.tsx",
  "dropdown-profile.tsx",
  "menu-trigger.tsx",
]);

function adaptImports(content) {
  return content.replaceAll(
    "@/registry/icons/icon-placeholder",
    "@/components/svg/icon-placeholder",
  );
}

for (const file of block.files ?? []) {
  const base = file.target.split("/").pop();
  const content = adaptImports(file.content);

  if (!chromeFiles.has(base)) {
    continue;
  }

  const path = resolve(root, targetDir, base);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  console.log("wrote", `${targetDir}/${base}`);
}

console.log("Skipped composable shell files (layout, page, sidebar, types).");
console.log("dropdown-profile.tsx: merge portal user prop manually if needed.");
console.log("sidebar-user-dropdown.tsx: merge portal user prop manually if needed.");
console.log("Done.");
