import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const PROXY_FILE = join(ROOT, "proxy.ts");
const ORG_LOGIN_PAGE = join(ROOT, "app", "org", "login", "page.tsx");

const REQUIRED_MATCHERS = [
  '"/"',
  '"/account/:path*"',
  '"/dashboard/:path*"',
  '"/client/:path*"',
  '"/playground/:path*"',
];

const PAGE_GUARDED_PUBLIC_PREFIXES = ["/survey/", "/f/"];

const PUBLIC_ROUTE_PREFIXES = [
  "/api/auth/",
  "/api/health/",
  "/auth/",
  "/org/login",
  "/invite/",
];

const FORBIDDEN_MATCHERS = ['"/org/:path*"'];

function main() {
  const source = readFileSync(PROXY_FILE, "utf8");
  const missing = REQUIRED_MATCHERS.filter((matcher) => !source.includes(matcher));

  if (missing.length > 0) {
    throw new Error(
      `proxy.ts is missing required matchers: ${missing.join(", ")}`,
    );
  }

  const matcherBlock = source.match(/matcher:\s*\[([\s\S]*?)\]/);
  const matcherSource = matcherBlock?.[1] ?? source;

  for (const prefix of PUBLIC_ROUTE_PREFIXES) {
    if (
      matcherSource.includes(`"${prefix}`) ||
      matcherSource.includes(`'${prefix}`)
    ) {
      throw new Error(
        `proxy.ts must not match public route prefix ${prefix}`,
      );
    }
  }

  for (const forbidden of FORBIDDEN_MATCHERS) {
    if (matcherSource.includes(forbidden)) {
      throw new Error(
        `proxy.ts must not match public auth entry ${forbidden}`,
      );
    }
  }

  if (!source.includes("export default async function proxy")) {
    throw new Error("proxy.ts must export the Next.js 16 proxy handler.");
  }

  if (!existsSync(ORG_LOGIN_PAGE)) {
    throw new Error("Missing canonical operator entry at app/org/login/page.tsx");
  }

  const orgLoginSource = readFileSync(ORG_LOGIN_PAGE, "utf8");
  if (!orgLoginSource.includes("runOrgSignInEntryPage")) {
    throw new Error(
      "app/org/login/page.tsx must delegate to runOrgSignInEntryPage from lib/org-sign-in-entry.ts",
    );
  }

  if (!orgLoginSource.includes('export const dynamic = "force-dynamic"')) {
    throw new Error("app/org/login/page.tsx must export dynamic = force-dynamic");
  }

  console.log(
    `check:proxy OK (${REQUIRED_MATCHERS.length} protected matchers, ${PUBLIC_ROUTE_PREFIXES.length} public prefixes excluded, ${PAGE_GUARDED_PUBLIC_PREFIXES.length} page-guarded link prefixes)`,
  );
}

try {
  main();
} catch (error) {
  console.error(
    `check:proxy failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}
