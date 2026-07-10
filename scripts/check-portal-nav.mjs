import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const ROUTES_FILE = join(ROOT, "lib", "routing", "portal-nav-routes.ts");

function extractRouteBlocks(source) {
  const routes = [];
  const blockPattern =
    /\{\s*id:\s*"([^"]+)"[\s\S]*?href:\s*"([^"]+)"[\s\S]*?page:\s*"([^"]+)"/g;

  for (const match of source.matchAll(blockPattern)) {
    routes.push({ id: match[1], href: match[2], page: match[3] });
  }

  return routes;
}

function readPortalRoutes() {
  const source = readFileSync(ROUTES_FILE, "utf8");
  return extractRouteBlocks(source);
}

function assertPageExists(route) {
  const pagePath = join(ROOT, route.page.replace(/\//g, "\\"));
  const unixPath = join(ROOT, route.page);
  if (!existsSync(pagePath) && !existsSync(unixPath)) {
    throw new Error(
      `Missing page for sidebar route "${route.id}": expected ${route.page}`,
    );
  }
}

function assertClientNavUsesContract() {
  const clientNav = readFileSync(join(ROOT, "lib", "client-nav.tsx"), "utf8");
  if (!clientNav.includes("CLIENT_SIDEBAR_ROUTES")) {
    throw new Error("lib/client-nav.tsx must import CLIENT_SIDEBAR_ROUTES.");
  }
  if (clientNav.includes('url: "/client/onboarding"')) {
    throw new Error(
      'Declarant profile must not link to /client/onboarding in client sidebar.',
    );
  }
}

function assertDashboardNavUsesContract() {
  const dashboardNav = readFileSync(
    join(ROOT, "lib", "dashboard-nav.tsx"),
    "utf8",
  );
  if (!dashboardNav.includes("ORG_OPERATOR_SIDEBAR_ROUTES")) {
    throw new Error(
      "lib/dashboard-nav.tsx must import ORG_OPERATOR_SIDEBAR_ROUTES.",
    );
  }
  for (const forbidden of ["/org/login", "/auth/admin"]) {
    if (dashboardNav.includes(`href: "${forbidden}"`) || dashboardNav.includes(`url: "${forbidden}"`)) {
      throw new Error(
        `Org operator sidebar must not include auth route ${forbidden}.`,
      );
    }
  }
}

function assertShellAdaptersUseContract() {
  const adapters = readFileSync(
    join(ROOT, "components", "portal", "portal-application-shell", "application-shell-05-adapters.tsx"),
    "utf8",
  );
  if (!adapters.includes("getOrgOperatorSidebarItems")) {
    throw new Error(
      "components/portal/portal-application-shell/application-shell-05-adapters.tsx must use getOrgOperatorSidebarItems().",
    );
  }
  if (!adapters.includes("getClientNavItems")) {
    throw new Error(
      "components/portal/portal-application-shell/application-shell-05-adapters.tsx must use getClientNavItems().",
    );
  }
}

function assertForbiddenAliases(routes) {
  const source = readFileSync(ROUTES_FILE, "utf8");
  const profile = routes.find((route) => route.id === "declarant-profile");
  if (!profile || profile.href !== "/client/profile") {
    throw new Error('Declarant profile sidebar route must be href "/client/profile".');
  }
  if (!source.includes('"declarant-profile": ["/client/onboarding"]')) {
    throw new Error("SIDEBAR_ROUTE_FORBIDDEN_ALIASES must block onboarding for profile.");
  }
}

function assertUniqueHrefs(routes) {
  const seen = new Set();
  for (const route of routes) {
    if (seen.has(route.href)) {
      throw new Error(`Duplicate sidebar href: ${route.href}`);
    }
    seen.add(route.href);
  }
}

function main() {
  const routes = readPortalRoutes();
  if (routes.length < 4) {
    throw new Error(
      `Expected at least 4 sidebar routes in ${ROUTES_FILE}, found ${routes.length}.`,
    );
  }

  assertUniqueHrefs(routes);
  assertForbiddenAliases(routes);
  assertClientNavUsesContract();
  assertDashboardNavUsesContract();
  assertShellAdaptersUseContract();

  for (const route of routes) {
    assertPageExists(route);
  }

  console.log(`check:nav OK (${routes.length} sidebar routes)`);
}

try {
  main();
} catch (error) {
  console.error(`check:nav failed: ${error.message}`);
  process.exit(1);
}
