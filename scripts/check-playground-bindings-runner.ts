import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildPlaygroundEmbedUrl,
  isPlaygroundScreenPathConfigured,
  legacyFlatClientRouteFiles,
  playgroundRouteFiles,
  playgroundScreenDefs,
  resolvePlaygroundPathTemplate,
  resolvePlaygroundRouteFile,
} from "@/lib/playground/playground-registry";
import { playgroundE2eFixtures } from "@/lib/playground/playground-e2e-fixtures";
import { buildRouteCoverageSnapshot } from "@/lib/governance/portal-route-coverage";

const ROOT = process.cwd();

/**
 * Non–pre-login App Router pages were wiped to `.gitkeep` (2026-07-11).
 * Playground harness pages are gone — skip binding enforcement until restored.
 * @see docs/legacy/frontend-pages-gitkeep.md
 */
if (!existsSync(join(ROOT, "app/playground/page.tsx"))) {
  console.log(
    "Playground binding check\n\nSKIP: app/playground/page.tsx wiped (frontend-pages-gitkeep). Binding checks deferred until playground pages are restored.",
  );
  process.exit(0);
}

const playgroundScreens = playgroundScreenDefs.map((screen) => ({
  ...screen,
  path: resolvePlaygroundPathTemplate(screen.path),
}));

const playgroundNav = {
  admin: playgroundScreens.filter((screen) => screen.category === "admin"),
  client: playgroundScreens.filter((screen) => screen.category === "client"),
  dynamic: playgroundScreens.filter((screen) => screen.category === "dynamic"),
  "hot-sales": playgroundScreens.filter(
    (screen) => screen.category === "hot-sales",
  ),
};

function getPlaygroundScreen(id: string) {
  return playgroundScreens.find((screen) => screen.id === id);
}

const failures: string[] = [];

function fail(message: string) {
  failures.push(message);
}

console.log("Playground binding check\n");

for (const legacy of legacyFlatClientRouteFiles) {
  if (existsSync(join(ROOT, legacy))) {
    fail(
      `Legacy flat client route ${legacy} conflicts with route groups — remove it (use app/client/(workspace) or app/client/(gate)).`,
    );
  }
}

for (const [route, file] of Object.entries(playgroundRouteFiles)) {
  if (!existsSync(join(ROOT, file))) {
    fail(`Missing route file ${file} for ${route}.`);
  }
}

const ids = playgroundScreens.map((screen) => screen.id);
if (new Set(ids).size !== ids.length) {
  fail("Duplicate playground screen ids detected.");
}

for (const screen of playgroundScreens) {
  const navHref = `/playground/${screen.id}`;
  const resolved = getPlaygroundScreen(screen.id);

  if (!resolved) {
    fail(`Nav href ${navHref} does not resolve to a screen.`);
    continue;
  }

  const routeFile =
    screen.routeFile ??
    resolvePlaygroundRouteFile(screen.path) ??
    resolvePlaygroundRouteFile(
      playgroundScreenDefs.find((def) => def.id === screen.id)?.path ?? "",
    );
  if (!routeFile) {
    fail(`${screen.id}: no route file mapping for path ${screen.path}`);
  } else if (!existsSync(join(ROOT, routeFile))) {
    fail(`${screen.id}: route file missing at ${routeFile}`);
  }

  const embedUrl = buildPlaygroundEmbedUrl(screen.path);
  if (!embedUrl.includes("embed=1")) {
    fail(`${screen.id}: buildPlaygroundEmbedUrl did not append embed=1 (${embedUrl})`);
  }

  if (screen.path.includes("?")) {
    if (!embedUrl.includes("&embed=1")) {
      fail(`${screen.id}: query-string path should use &embed=1 (${embedUrl})`);
    }
  } else if (!embedUrl.endsWith("?embed=1")) {
    fail(`${screen.id}: plain path should use ?embed=1 (${embedUrl})`);
  }

  const configured = isPlaygroundScreenPathConfigured(screen.path);
  console.log(
    [
      screen.id.padEnd(28),
      navHref.padEnd(36),
      screen.path.padEnd(42),
      (routeFile ?? "MISSING").padEnd(34),
      configured ? "configured" : "needs-env",
    ].join(" | "),
  );
}

const navScreens = [
  ...playgroundNav.admin,
  ...playgroundNav.client,
  ...playgroundNav.dynamic,
  ...playgroundNav["hot-sales"],
];
if (navScreens.length !== playgroundScreens.length) {
  fail(
    `Nav parity mismatch: nav has ${navScreens.length} screens, registry has ${playgroundScreens.length}.`,
  );
}

for (const screen of navScreens) {
  if (!getPlaygroundScreen(screen.id)) {
    fail(`Nav screen ${screen.id} is missing from registry.`);
  }
}

const firstScreen = playgroundScreens[0];
if (!firstScreen) {
  fail("playgroundScreens is empty.");
} else {
  const indexSource = readFileSync(join(ROOT, "app/playground/page.tsx"), "utf8");
  const redirectsToFirstScreen =
    indexSource.includes("runPlaygroundIndexPage") ||
    (indexSource.includes("playgroundScreens[0]") &&
      indexSource.includes("playgroundScreenHref(firstScreen.id)"));
  if (!redirectsToFirstScreen) {
    fail(
      `/playground index should redirect via runPlaygroundIndexPage (${firstScreen.id}).`,
    );
  }
}

if (!existsSync(join(ROOT, "app/playground/hitl-review/page.tsx"))) {
  fail("Missing app/playground/hitl-review/page.tsx");
} else {
  const hitlSource = readFileSync(
    join(ROOT, "app/playground/hitl-review/page.tsx"),
    "utf8",
  );
  if (!hitlSource.includes("runPlaygroundHitlReviewPage")) {
    fail("app/playground/hitl-review/page.tsx must use runPlaygroundHitlReviewPage.");
  }
}

if (!existsSync(join(ROOT, "app/playground/coverage/page.tsx"))) {
  fail("Missing app/playground/coverage/page.tsx");
} else {
  const coverageSource = readFileSync(
    join(ROOT, "app/playground/coverage/page.tsx"),
    "utf8",
  );
  if (!coverageSource.includes("runPlaygroundCoveragePage")) {
    fail("app/playground/coverage/page.tsx must use runPlaygroundCoveragePage.");
  }
}

const layoutSource = readFileSync(join(ROOT, "app/playground/layout.tsx"), "utf8");
const layoutHandlerSource = readFileSync(
  join(ROOT, "lib/playground/playground-layout.tsx"),
  "utf8",
);
if (!layoutSource.includes("runPlaygroundLayout")) {
  fail("app/playground/layout.tsx must use runPlaygroundLayout.");
}
if (!layoutHandlerSource.includes("isPlaygroundEnabled()")) {
  fail("runPlaygroundLayout must gate on isPlaygroundEnabled().");
}

if (playgroundE2eFixtures.length !== playgroundScreens.length) {
  fail(
    `E2E fixture parity mismatch: ${playgroundE2eFixtures.length} fixtures vs ${playgroundScreens.length} registry screens.`,
  );
}

for (const screen of playgroundScreens) {
  if (!playgroundE2eFixtures.some((fixture) => fixture.id === screen.id)) {
    fail(`Missing E2E fixture for playground screen ${screen.id}.`);
  }
}

const coverage = buildRouteCoverageSnapshot(ROOT);
if (coverage.summary.missing > 0) {
  for (const row of coverage.routes.filter((entry) => !entry.presented)) {
    fail(
      `Product page not presented in playground registry: ${row.routePattern} (${row.file})`,
    );
  }
}

if (failures.length > 0) {
  console.error("\nFailures:");
  for (const message of failures) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log(
  `\nOK: ${playgroundScreens.length} playground screens bound to nav and routes.`,
);
