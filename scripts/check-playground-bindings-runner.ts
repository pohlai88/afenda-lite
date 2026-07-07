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
} from "../lib/playground-registry";
import { playgroundE2eFixtures } from "../lib/playground-e2e-fixtures";

const ROOT = process.cwd();

const playgroundScreens = playgroundScreenDefs.map((screen) => ({
  ...screen,
  path: resolvePlaygroundPathTemplate(screen.path),
}));

const playgroundNav = {
  admin: playgroundScreens.filter((screen) => screen.category === "admin"),
  client: playgroundScreens.filter((screen) => screen.category === "client"),
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

const navScreens = [...playgroundNav.admin, ...playgroundNav.client];
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
    indexSource.includes("playgroundScreens[0]") &&
    indexSource.includes("playgroundScreenHref(firstScreen.id)");
  if (!redirectsToFirstScreen) {
    fail(
      `/playground index should redirect to playgroundScreens[0] (${firstScreen.id}).`,
    );
  }
}

const layoutSource = readFileSync(join(ROOT, "app/playground/layout.tsx"), "utf8");
if (!layoutSource.includes("isPlaygroundEnabled()")) {
  fail("app/playground/layout.tsx must gate on isPlaygroundEnabled().");
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
