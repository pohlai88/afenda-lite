import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  LIB_IMPORT_DOMAIN_MAP,
  SESSION_HELPER_ACTIONS,
} from "@/lib/routing/surface-entry-points";
import { API_ROUTE_ACTION_IDS } from "@/lib/api/routes";

export type RelianceCoverageIssue = {
  code:
    | "missing-entry-point"
    | "undeclared-action"
    | "missing-declared-action"
    | "missing-declared-auth"
    | "missing-auth-pathname"
    | "undeclared-action-export"
    | "missing-action-domain"
    | "extra-action-domain"
    | "orphan-action-export";
  message: string;
};

export type RelianceCoverageReport = {
  ok: boolean;
  issues: RelianceCoverageIssue[];
  scannedFiles: number;
  surfacesScanned: number;
};

const MAX_TRANSITIVE_DEPTH = 6;

function parseNamedImports(block: string): string[] {
  return block
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/^type\s+/, "").split(/\s+as\s+/)[0]?.trim())
    .filter((name): name is string => Boolean(name) && name !== "type");
}

function extractActionImports(content: string): string[] {
  const names: string[] = [];
  const re = /import\s*\{([^}]+)\}\s*from\s*["']@\/app\/actions\/([^"']+)["']/g;

  for (const match of content.matchAll(re)) {
    names.push(...parseNamedImports(match[1] ?? ""));
  }

  return names;
}

function extractSessionImports(content: string): string[] {
  const names: string[] = [];
  const re = /import\s*\{([^}]+)\}\s*from\s*["']@\/lib\/auth\/session["']/g;

  for (const match of content.matchAll(re)) {
    for (const name of parseNamedImports(match[1] ?? "")) {
      if (SESSION_HELPER_ACTIONS[name]) {
        names.push(name);
      }
    }
  }

  return names;
}

export function extractLibImports(content: string): string[] {
  const specs: string[] = [];
  const patterns = [
    /import\s+(?:type\s+)?\{[^}]+\}\s*from\s*["'](@\/lib\/[^"']+)["']/g,
    /import\s+(?!type)(\w+)\s*from\s*["'](@\/lib\/[^"']+)["']/g,
  ];

  for (const re of patterns) {
    for (const match of content.matchAll(re)) {
      const spec = match[2] ?? match[1];
      if (spec?.startsWith("@/lib/")) {
        specs.push(spec);
      }
    }
  }

  return specs;
}

function extractComponentImports(content: string): string[] {
  const specs: string[] = [];
  const re =
    /import\s+(?:type\s+)?(?:\{[^}]*\}|[\w*\s,]+)\s+from\s+["'](@\/components\/[^"']+)["']/g;

  for (const match of content.matchAll(re)) {
    if (match[1]) {
      specs.push(match[1]);
    }
  }

  return specs;
}

const COMPONENT_L2_FOLDERS = ["client", "operator", "portal"] as const;

function resolveBarrelPath(repoRoot: string, relativePath: string): string {
  let current = relativePath.replace(/\\/g, "/");

  for (let depth = 0; depth < 4; depth += 1) {
    const absolute = join(repoRoot, current);
    if (!existsSync(absolute)) {
      return relativePath;
    }

    const content = readFileSync(absolute, "utf8");
    const reexport = content.match(/^export\s+\*\s+from\s+["']\.\/([^"']+)["']/m);
    if (!reexport?.[1]) {
      return current;
    }

    const dir = dirname(current).replace(/\\/g, "/");
    const stem = reexport[1];
    const nextCandidates = [`${dir}/${stem}.tsx`, `${dir}/${stem}.ts`, `${dir}/${stem}`];
    const next = nextCandidates.find((candidate) => existsSync(join(repoRoot, candidate)));
    if (!next) {
      return current;
    }
    current = next.replace(/\\/g, "/");
  }

  return current;
}

function componentSpecifierToPath(specifier: string, repoRoot: string): string | null {
  if (!specifier.startsWith("@/components/")) {
    return null;
  }

  const relative = specifier.slice("@/components/".length);
  const candidates = [
    `components/${relative}.tsx`,
    `components/${relative}.ts`,
    ...COMPONENT_L2_FOLDERS.flatMap((folder) => [
      `components/${folder}/${relative}.tsx`,
      `components/${folder}/${relative}.ts`,
    ]),
    `components/${relative}/index.tsx`,
  ];

  for (const candidate of candidates) {
    if (existsSync(join(repoRoot, candidate))) {
      return resolveBarrelPath(repoRoot, candidate);
    }
  }

  return null;
}

export function collectTransitiveSourceFiles(
  entryFiles: readonly string[],
  repoRoot: string = process.cwd(),
): string[] {
  const queue: Array<{ file: string; depth: number }> = [];
  const seen = new Set<string>();

  for (const file of entryFiles) {
    queue.push({ file, depth: 0 });
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current.file)) {
      continue;
    }

    seen.add(current.file);
    const absolute = join(repoRoot, current.file);

    if (!existsSync(absolute)) {
      continue;
    }

    const content = readFileSync(absolute, "utf8");

    if (current.depth >= MAX_TRANSITIVE_DEPTH) {
      continue;
    }

    for (const spec of extractComponentImports(content)) {
      const resolved = componentSpecifierToPath(spec, repoRoot);
      if (resolved && !seen.has(resolved)) {
        queue.push({ file: resolved, depth: current.depth + 1 });
      }
    }
  }

  return [...seen].sort();
}

export function libImportToDomainIds(specifier: string): string[] {
  const matches = LIB_IMPORT_DOMAIN_MAP.filter((entry) => specifier.startsWith(entry.prefix));
  return [...new Set(matches.map((entry) => entry.domainId))];
}

function extractApiRouteTargets(content: string): string[] {
  const targets: string[] = [];

  for (const [constant, actionId] of Object.entries(API_ROUTE_ACTION_IDS)) {
    if (content.includes(constant)) {
      targets.push(actionId);
    }
  }

  return targets;
}

function discoveredTargetsFromFile(content: string): Set<string> {
  const targets = new Set<string>();

  for (const actionName of extractActionImports(content)) {
    targets.add(`action:${actionName}`);
  }

  for (const sessionName of extractSessionImports(content)) {
    const actionId = SESSION_HELPER_ACTIONS[sessionName];
    if (actionId) {
      targets.add(actionId);
    }
  }

  for (const actionId of extractApiRouteTargets(content)) {
    targets.add(actionId);
  }

  for (const libSpec of extractLibImports(content)) {
    for (const domainId of libImportToDomainIds(libSpec)) {
      targets.add(domainId);
    }
  }

  return targets;
}

export function authPathnamePresent(source: string, pathname: string): boolean {
  return (
    source.includes(`"/auth/${pathname}"`) ||
    source.includes(`'/auth/${pathname}'`) ||
    source.includes(`"${pathname}"`) ||
    source.includes(`'${pathname}'`)
  );
}

export function readSource(repoRoot: string, relativePath: string): string {
  const resolved = resolveBarrelPath(repoRoot, relativePath.replace(/\\/g, "/"));
  return readFileSync(join(repoRoot, resolved), "utf8");
}

export function listExportedActionIds(repoRoot: string): string[] {
  const actionDir = join(repoRoot, "app/actions");
  const files = ["admin.ts", "client.ts", "declarations.ts", "surveys.ts", "account.ts"];
  const exports: string[] = [];

  for (const file of files) {
    const content = readSource(repoRoot, join("app/actions", file));
    for (const match of content.matchAll(/export async function (\w+)/g)) {
      if (match[1]) {
        exports.push(`action:${match[1]}`);
      }
    }
    for (const match of content.matchAll(/export \{([^}]+)\}/g)) {
      for (const name of parseNamedImports(match[1] ?? "")) {
        if (SESSION_HELPER_ACTIONS[name]) {
          exports.push(SESSION_HELPER_ACTIONS[name]);
        }
      }
    }
  }

  for (const [helperName, actionId] of Object.entries(SESSION_HELPER_ACTIONS)) {
    const libPath =
      helperName === "requireAccountSession"
        ? "lib/account-session.ts"
        : "lib/auth/session.ts";
    const libSource = readSource(repoRoot, libPath);
    const exported =
      libSource.includes(`export async function ${helperName}`) ||
      libSource.includes(`export const ${helperName}`);
    if (exported) {
      exports.push(actionId);
    }
  }

  return [...new Set(exports)].sort();
}

export function scanDiscoveredTargetsForFiles(
  files: readonly string[],
  repoRoot: string,
): string[] {
  const discovered = new Set<string>();

  for (const file of files) {
    discoveredTargetsFromFile(readSource(repoRoot, file)).forEach((target) => {
      discovered.add(target);
    });
  }

  return [...discovered].sort();
}
