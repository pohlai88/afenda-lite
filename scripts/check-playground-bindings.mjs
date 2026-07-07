import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";

const ROOT = process.cwd();

function loadEnvFile() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

function env(name) {
  return process.env[name]?.trim() ?? "";
}

function resolvePath(template) {
  return template
    .replace("{PLAYGROUND_SURVEY_ID}", env("PLAYGROUND_SURVEY_ID"))
    .replace("{PLAYGROUND_ASSIGNMENT_ID}", env("PLAYGROUND_ASSIGNMENT_ID"))
    .replace("{PLAYGROUND_SURVEY_SLUG}", env("PLAYGROUND_SURVEY_SLUG"));
}

const playgroundScreenDefs = [
  { id: "admin-dashboard", category: "admin", label: "Dashboard", path: "/dashboard" },
  { id: "admin-clients", category: "admin", label: "Clients", path: "/dashboard/clients" },
  {
    id: "admin-survey-detail",
    category: "admin",
    label: "Survey detail",
    path: "/dashboard/{PLAYGROUND_SURVEY_ID}",
  },
  { id: "client-home-login", category: "client", label: "Home / client login", path: "/" },
  { id: "client-org-login", category: "client", label: "Org login", path: "/org/login" },
  {
    id: "client-org-access-denied",
    category: "client",
    label: "Org access denied",
    path: "/org/login?reason=access-denied",
  },
  { id: "client-dashboard", category: "client", label: "Client dashboard", path: "/client" },
  {
    id: "client-onboarding",
    category: "client",
    label: "Client onboarding",
    path: "/client/onboarding",
  },
  {
    id: "client-declare",
    category: "client",
    label: "Declaration form",
    path: "/client/declare/{PLAYGROUND_ASSIGNMENT_ID}",
  },
  {
    id: "client-public-survey",
    category: "client",
    label: "Public survey",
    path: "/survey/{PLAYGROUND_SURVEY_SLUG}",
  },
];

const playgroundScreens = playgroundScreenDefs.map((screen) => ({
  ...screen,
  path: resolvePath(screen.path),
}));

const playgroundNav = {
  admin: playgroundScreens.filter((screen) => screen.category === "admin"),
  client: playgroundScreens.filter((screen) => screen.category === "client"),
};

function buildEmbedUrl(path) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}embed=1`;
}

function isPlaygroundScreenPathConfigured(path) {
  if (!path || path.includes("{PLAYGROUND_")) return false;
  const [pathname] = path.split("?");
  if (pathname.endsWith("/") && pathname !== "/") return false;
  return true;
}

const routeFiles = {
  "/dashboard": "app/dashboard/page.tsx",
  "/dashboard/clients": "app/dashboard/clients/page.tsx",
  "/dashboard/{id}": "app/dashboard/[id]/page.tsx",
  "/": "app/page.tsx",
  "/org/login": "app/org/login/page.tsx",
  "/client": "app/client/page.tsx",
  "/client/onboarding": "app/client/onboarding/page.tsx",
  "/client/declare/{id}": "app/client/declare/[id]/page.tsx",
  "/client/preview-unavailable": "app/client/preview-unavailable/page.tsx",
  "/survey/{slug}": "app/survey/[slug]/page.tsx",
};

function resolveRouteFile(path) {
  const [pathname] = path.split("?");

  if (routeFiles[pathname]) return routeFiles[pathname];
  if (/^\/dashboard\/[^/]+$/.test(pathname)) return routeFiles["/dashboard/{id}"];
  if (/^\/client\/declare\/[^/]+$/.test(pathname)) return routeFiles["/client/declare/{id}"];
  if (/^\/survey\/[^/]+$/.test(pathname)) return routeFiles["/survey/{slug}"];
  return null;
}

function getPlaygroundScreen(id) {
  return playgroundScreens.find((screen) => screen.id === id);
}

const failures = [];

function fail(message) {
  failures.push(message);
}

console.log("Playground binding check\n");

const ids = playgroundScreens.map((screen) => screen.id);
const uniqueIds = new Set(ids);
if (uniqueIds.size !== ids.length) {
  fail("Duplicate playground screen ids detected.");
}

for (const screen of playgroundScreens) {
  const navHref = `/playground/${screen.id}`;
  const resolved = getPlaygroundScreen(screen.id);

  if (!resolved) {
    fail(`Nav href ${navHref} does not resolve to a screen.`);
    continue;
  }

  const routeFile = resolveRouteFile(screen.path);
  if (!routeFile) {
    fail(`${screen.id}: no route file mapping for path ${screen.path}`);
  } else if (!existsSync(join(ROOT, routeFile))) {
    fail(`${screen.id}: route file missing at ${routeFile}`);
  }

  const embedUrl = buildEmbedUrl(screen.path);
  if (!embedUrl.includes("embed=1")) {
    fail(`${screen.id}: buildEmbedUrl did not append embed=1 (${embedUrl})`);
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
      screen.id.padEnd(24),
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
  if (
    !indexSource.includes("playgroundScreens[0]") ||
    !indexSource.includes("redirect(`/playground/${firstScreen.id}`)")
  ) {
    fail(
      `/playground index should redirect to playgroundScreens[0] (${firstScreen.id}).`,
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

console.log(`\nOK: ${playgroundScreens.length} playground screens bound to nav and routes.`);
