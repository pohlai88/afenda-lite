import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import process from "node:process";

const repoRoot = process.cwd();

const SCAN_ROOTS = [
  join(repoRoot, "components"),
  join(repoRoot, "lib", "domain"),
];

const PAGE_GLOB_ROOT = join(repoRoot, "app");

const FORBIDDEN_IN_COMPONENTS = [
  { pattern: /from\s+["']@\/lib\/db["']/, label: "@/lib/db import" },
  { pattern: /from\s+["']pg["']/, label: "pg import" },
  { pattern: /from\s+["']@neondatabase\//, label: "@neondatabase import" },
];

const NEON_AUTH_BRIDGE_FILES = new Set([
  "components/portal/portal-account-neon-view.tsx",
  "components/portal/portal-auth-neon-view.tsx",
  "components/portal/portal-auth-provider.tsx",
]);

const FORBIDDEN_IN_DOMAIN = [
  { pattern: /from\s+["']@\/app\/actions\//, label: "@/app/actions import" },
  { pattern: /from\s+["']react["']/, label: "react import" },
  { pattern: /from\s+["']@neondatabase\//, label: "@neondatabase import" },
];

const MAX_PAGE_LINES = 30;

function listSourceFiles(dir, acc = []) {
  if (!existsSync(dir)) {
    return acc;
  }

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") {
        continue;
      }
      listSourceFiles(fullPath, acc);
      continue;
    }

    if (/\.(tsx?|jsx?)$/.test(entry)) {
      acc.push(fullPath);
    }
  }

  return acc;
}

function listPageFiles(dir, acc = []) {
  if (!existsSync(dir)) {
    return acc;
  }

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      listPageFiles(fullPath, acc);
      continue;
    }

    if (entry === "page.tsx" || entry === "page.ts") {
      acc.push(fullPath);
    }
  }

  return acc;
}

function scanForbiddenImports(files, rules, options = {}) {
  const violations = [];
  const { allowlist = new Set() } = options;

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const rel = relative(repoRoot, file).replace(/\\/g, "/");

    if (allowlist.has(rel)) {
      continue;
    }

    for (const rule of rules) {
      if (rule.pattern.test(content)) {
        violations.push(`${rel}: ${rule.label}`);
      }
    }
  }

  return violations;
}

function scanThinPages() {
  const warnings = [];

  for (const file of listPageFiles(PAGE_GLOB_ROOT)) {
    const rel = relative(repoRoot, file).replace(/\\/g, "/");
    const lines = readFileSync(file, "utf8").split(/\r?\n/).length;
    if (lines > MAX_PAGE_LINES) {
      warnings.push(`${rel}: ${lines} lines (warn > ${MAX_PAGE_LINES})`);
    }
  }

  return warnings;
}

function scanCollapsedLegacyFolders() {
  const violations = [];
  const forbidden = [
    ["hooks", "use components/hooks/"],
    ["registry", "use components/svg/"],
    ["supabase", "see docs/legacy/supabase.md"],
    ["config/neon-auth.manifest.json", "use lib/auth/neon-auth.manifest.json"],
  ];

  for (const [path, hint] of forbidden) {
    if (existsSync(join(repoRoot, path))) {
      violations.push(`legacy path "${path}" must not exist (${hint})`);
    }
  }

  const componentsRoot = join(repoRoot, "components");
  if (existsSync(componentsRoot)) {
    for (const entry of readdirSync(componentsRoot)) {
      if (/^(client|operator|org|portal)-.+\.(tsx?|jsx?)$/.test(entry)) {
        violations.push(
          `components/${entry}: flat L2 file — move under components/client|operator|portal/`,
        );
      }
    }
  }

  return violations;
}

function main() {
  const componentFiles = listSourceFiles(join(repoRoot, "components"));
  const domainFiles = listSourceFiles(join(repoRoot, "lib", "domain"));
  const violations = [
    ...scanCollapsedLegacyFolders(),
    ...scanForbiddenImports(componentFiles, FORBIDDEN_IN_COMPONENTS, {
      allowlist: NEON_AUTH_BRIDGE_FILES,
    }),
    ...scanForbiddenImports(domainFiles, FORBIDDEN_IN_DOMAIN),
  ];
  const pageWarnings = scanThinPages();

  if (violations.length > 0) {
    console.error("check:import-boundaries failed:");
    for (const violation of violations) {
      console.error(`  - ${violation}`);
    }
    process.exit(1);
  }

  console.log(
    `check:import-boundaries OK (${componentFiles.length} component + ${domainFiles.length} domain files, ${listPageFiles(PAGE_GLOB_ROOT).length} pages)`,
  );

  if (pageWarnings.length > 0) {
    console.warn(`check:import-boundaries page size warnings (${pageWarnings.length}):`);
    for (const warning of pageWarnings.slice(0, 10)) {
      console.warn(`  - ${warning}`);
    }
    if (pageWarnings.length > 10) {
      console.warn(`  ... and ${pageWarnings.length - 10} more`);
    }
  }
}

main();
