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
} from "@/features/playground/playground-registry";
import { playgroundE2eFixtures } from "@/features/playground/playground-e2e-fixtures";
import {
  getPlaygroundRouteReview,
  playgroundRouteReviewById,
} from "@/features/playground/playground-route-review";
import { buildRouteCoverageSnapshot } from "@/modules/platform/governance/portal-route-coverage";

const ROOT = process.cwd();

const playgroundScreens = playgroundScreenDefs.map((screen) => ({
  ...screen,
  path: resolvePlaygroundPathTemplate(screen.path),
}));

const playgroundNav = {
  admin: playgroundScreens.filter((screen) => screen.category === "admin"),
  client: playgroundScreens.filter((screen) => screen.category === "client"),
  dynamic: playgroundScreens.filter((screen) => screen.category === "dynamic"),
  "fft": playgroundScreens.filter(
    (screen) => screen.category === "fft",
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

const requiredHarnessFiles = [
  "app/playground/page.tsx",
  "app/playground/layout.tsx",
  "app/playground/loading.tsx",
  "app/playground/error.tsx",
  "app/playground/[screenId]/page.tsx",
  "app/playground/coverage/page.tsx",
  "app/playground/hitl-review/page.tsx",
  "app/playground/hitl-review/loading.tsx",
] as const;

for (const file of requiredHarnessFiles) {
  if (!existsSync(join(ROOT, file))) {
    fail(`Missing playground harness file ${file}`);
  }
}

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
if (Object.keys(playgroundRouteReviewById).length !== playgroundScreens.length) {
  fail(
    `Route review parity mismatch: ${Object.keys(playgroundRouteReviewById).length} definitions vs ${playgroundScreens.length} registry screens.`,
  );
}

for (const screen of playgroundScreens) {
  const navHref = `/playground/${screen.id}`;
  const resolved = getPlaygroundScreen(screen.id);

  if (!resolved) {
    fail(`Nav href ${navHref} does not resolve to a screen.`);
    continue;
  }

  const review = getPlaygroundRouteReview(screen.id);
  if (!review) {
    fail(`${screen.id}: missing route-review definition.`);
  } else {
    for (const evidencePath of review.evidence) {
      if (!existsSync(join(ROOT, evidencePath))) {
        fail(`${screen.id}: route-review evidence missing at ${evidencePath}`);
      }
    }
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
  ...playgroundNav["fft"],
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
} else if (!existsSync(join(ROOT, "app/playground/page.tsx"))) {
  fail("Missing app/playground/page.tsx");
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
  join(ROOT, "features/playground/playground-layout.tsx"),
  "utf8",
);
if (!layoutSource.includes("runPlaygroundLayout")) {
  fail("app/playground/layout.tsx must use runPlaygroundLayout.");
}
if (!layoutHandlerSource.includes("isPlaygroundEnabled()")) {
  fail("runPlaygroundLayout must gate on isPlaygroundEnabled().");
}
if (!layoutHandlerSource.includes("requireAdminSession()")) {
  fail("runPlaygroundLayout must require an authenticated admin session.");
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
