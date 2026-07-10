import { scanAppPageRoutes } from "@/lib/governance/portal-route-inventory";
import {
  playgroundScreenDefs,
  resolvePlaygroundPathTemplate,
  resolvePlaygroundRouteFile,
  type PlaygroundScreenDef,
} from "@/lib/playground/playground-registry";
import type { PlaygroundScreen } from "@/lib/playground/playground";

/**
 * Convert a route pattern like `/trade/[locale]/events` into a path template
 * suitable for playground embedding (keeps brackets when no fixture exists).
 */
function routePatternToPathTemplate(routePattern: string): string {
  return routePattern
    .replaceAll("[locale]", "{PLAYGROUND_TRADE_LOCALE}")
    .replaceAll("[id]", "{PLAYGROUND_UNRESOLVED_ID}")
    .replaceAll("[path]", "{PLAYGROUND_UNRESOLVED_PATH}")
    .replaceAll("[slug]", "{PLAYGROUND_UNRESOLVED_SLUG}")
    .replaceAll("[token]", "{PLAYGROUND_UNRESOLVED_TOKEN}");
}

function slugFromFile(file: string): string {
  return file
    .replace(/^app\//, "")
    .replace(/\/page\.tsx$/, "")
    .replaceAll(/[()[\]]/g, "")
    .replaceAll("/", "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function collectCuratedRouteFiles(): Set<string> {
  const files = new Set<string>();

  for (const screen of playgroundScreenDefs) {
    const file =
      screen.routeFile ??
      resolvePlaygroundRouteFile(screen.path) ??
      null;
    if (file) {
      files.add(file);
    }
  }

  return files;
}

/**
 * Diff filesystem product pages against the curated registry.
 * Any page with no curated screen becomes a synthetic `auto:*` screen so it
 * always appears in the playground — never silently missing.
 */
export function discoverUncuratedPlaygroundScreens(
  rootDir: string = process.cwd(),
): PlaygroundScreenDef[] {
  const curatedFiles = collectCuratedRouteFiles();
  const inventory = scanAppPageRoutes(rootDir);
  const autoScreens: PlaygroundScreenDef[] = [];

  for (const entry of inventory) {
    if (curatedFiles.has(entry.file)) {
      continue;
    }

    const slug = slugFromFile(entry.file) || "unknown";
    autoScreens.push({
      id: `auto:${slug}`,
      category: "auto",
      label: `Auto · ${entry.routePattern}`,
      path: routePatternToPathTemplate(entry.routePattern),
      routeFile: entry.file,
    });
  }

  return autoScreens;
}

export function buildPlaygroundScreensWithAutoDiscovery(
  rootDir: string = process.cwd(),
): PlaygroundScreen[] {
  const curated: PlaygroundScreen[] = playgroundScreenDefs.map((screen) => ({
    ...screen,
    path: resolvePlaygroundPathTemplate(screen.path),
  }));

  const auto = discoverUncuratedPlaygroundScreens(rootDir).map((screen) => ({
    ...screen,
    path: resolvePlaygroundPathTemplate(screen.path),
  }));

  return [...curated, ...auto];
}

export function getPlaygroundScreenWithAutoDiscovery(
  id: string,
  rootDir: string = process.cwd(),
): PlaygroundScreen | undefined {
  return buildPlaygroundScreensWithAutoDiscovery(rootDir).find(
    (screen) => screen.id === id,
  );
}

/** True when the path still has unresolved dynamic placeholders. */
export function hasUnresolvedPlaygroundPlaceholders(path: string): boolean {
  return (
    path.includes("{PLAYGROUND_") ||
    path.includes("[") ||
    path.includes("]")
  );
}
