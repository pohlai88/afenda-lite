import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Journey-phase tags for product App Router pages.
 * Matches the Phase map in docs/architecture/journey-phase-playbook.md.
 */
export type JourneyPhaseId =
  | "pre-login"
  | "join"
  | "onboarding"
  | "client-post-login"
  | "operator-post-login"
  | "hot-sales";

export type PortalRouteInventoryEntry = {
  /** Posix-style path relative to repo root, e.g. `app/dashboard/page.tsx`. */
  file: string;
  /** URL pattern with dynamic segments kept literal, e.g. `/dashboard/[id]`. */
  routePattern: string;
  phase: JourneyPhaseId;
};

const JOURNEY_PHASES: readonly JourneyPhaseId[] = [
  "pre-login",
  "join",
  "onboarding",
  "client-post-login",
  "operator-post-login",
  "hot-sales",
] as const;

export function listJourneyPhases(): readonly JourneyPhaseId[] {
  return JOURNEY_PHASES;
}

/**
 * Convert an app page.tsx file path into a URL route pattern.
 * Strips route groups `(name)` and keeps `[param]` segments.
 */
export function filePathToRoutePattern(filePath: string): string {
  const normalized = filePath.replaceAll("\\", "/");
  const withoutPrefix = normalized.startsWith("app/")
    ? normalized.slice("app/".length)
    : normalized;
  const withoutPage = withoutPrefix.endsWith("/page.tsx")
    ? withoutPrefix.slice(0, -"/page.tsx".length)
    : withoutPrefix === "page.tsx"
      ? ""
      : withoutPrefix;

  if (!withoutPage) {
    return "/";
  }

  const routeGroupPattern = /^\([^)]+\)$/;
  const segments = withoutPage
    .split("/")
    .filter((segment) => segment.length > 0 && !routeGroupPattern.test(segment));

  if (segments.length === 0) {
    return "/";
  }

  return "/" + segments.join("/");
}

/**
 * Tag a route pattern with its journey phase.
 * More-specific prefixes win over broader ones.
 */
export function tagRoutePhase(routePattern: string): JourneyPhaseId {
  const path = routePattern.split("?")[0] ?? routePattern;

  if (path === "/join" || path.startsWith("/join/")) {
    return "join";
  }

  if (path === "/client/onboarding" || path.startsWith("/client/onboarding/")) {
    return "onboarding";
  }

  if (
    path === "/client/declare" ||
    path.startsWith("/client/declare/") ||
    path === "/client/profile" ||
    path.startsWith("/client/profile/") ||
    path === "/client"
  ) {
    return "client-post-login";
  }

  if (path === "/dashboard" || path.startsWith("/dashboard/")) {
    return "operator-post-login";
  }

  if (path === "/trade" || path.startsWith("/trade/")) {
    return "hot-sales";
  }

  // `/`, `/auth/*`, `/org/login`, `/client/login`, `/invite/*`, `/f/*`,
  // `/survey/*`, `/account/*`, `/client/preview-unavailable`, etc.
  return "pre-login";
}

function walkPageFiles(dir: string, rootDir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const name of entries) {
    const full = join(dir, name);
    let stats;
    try {
      stats = statSync(full);
    } catch {
      continue;
    }

    if (stats.isDirectory()) {
      // Skip playground harness meta-routes — not product pages.
      const rel = relative(rootDir, full).replaceAll("\\", "/");
      if (rel === "app/playground" || rel.startsWith("app/playground/")) {
        continue;
      }
      walkPageFiles(full, rootDir, out);
      continue;
    }

    if (name === "page.tsx") {
      out.push(relative(rootDir, full).split(sep).join("/"));
    }
  }
}

/**
 * Scan app page.tsx files for product routes (excludes app/playground).
 */
export function scanAppPageRoutes(
  rootDir: string = process.cwd(),
): PortalRouteInventoryEntry[] {
  const files: string[] = [];
  walkPageFiles(join(rootDir, "app"), rootDir, files);
  files.sort((a, b) => a.localeCompare(b));

  return files.map((file) => {
    const routePattern = filePathToRoutePattern(file);
    return {
      file,
      routePattern,
      phase: tagRoutePhase(routePattern),
    };
  });
}
