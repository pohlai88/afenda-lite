import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const PROXY_FILE = join(ROOT, "proxy.ts");
const ORG_LOGIN_PAGE = join(ROOT, "app", "org", "login", "page.tsx");

const REQUIRED_MATCHERS = [
  '"/account/:path*"',
  '"/dashboard/:path*"',
  '"/client/:path*"',
  '"/trade/:path*"',
  '"/playground/:path*"',
];

const PAGE_GUARDED_PUBLIC_PREFIXES = ["/survey/", "/f/"];

const PUBLIC_ROUTE_PREFIXES = [
  "/api/auth/",
  "/api/health/",
  "/auth/",
  "/join",
  "/org/login",
  "/invite/",
];

/** Session matcher bypasses — must remain public even under `/client/:path*`. */
const REQUIRED_CLIENT_BYPASSES = [
  "CLIENT_SIGN_IN_ENTRY_HREF",
  "CLIENT_PREVIEW_UNAVAILABLE_HREF",
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

  // Guest Lynx Morphor landing at `/` must remain public (Sign in CTA → /auth/sign-in).
  if (/^\s*"\/"\s*,?\s*$/m.test(matcherSource)) {
    throw new Error('proxy.ts must not match public guest landing "/"');
  }

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

  // Page-guarded public link prefixes must stay out of the session matcher.
  for (const prefix of PAGE_GUARDED_PUBLIC_PREFIXES) {
    if (
      matcherSource.includes(`"${prefix}`) ||
      matcherSource.includes(`'${prefix}`)
    ) {
      throw new Error(
        `proxy.ts must not match page-guarded public prefix ${prefix}`,
      );
    }
  }

  for (const bypass of REQUIRED_CLIENT_BYPASSES) {
    if (!source.includes(bypass)) {
      throw new Error(
        `proxy.ts must bypass ${bypass} so named client entries stay public`,
      );
    }
  }

  if (!source.includes("isClientSignInEntry")) {
    throw new Error(
      "proxy.ts must short-circuit CLIENT_SIGN_IN_ENTRY_HREF (/client/login)",
    );
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
      "app/org/login/page.tsx must delegate to runOrgSignInEntryPage from lib/entry/org-sign-in-entry.ts",
    );
  }

  if (!orgLoginSource.includes('export const dynamic = "force-dynamic"')) {
    throw new Error("app/org/login/page.tsx must export dynamic = force-dynamic");
  }

  const surveyPage = join(ROOT, "app", "survey", "[slug]", "page.tsx");
  if (!existsSync(surveyPage)) {
    throw new Error("Missing open-link page at app/survey/[slug]/page.tsx");
  }
  const surveySource = readFileSync(surveyPage, "utf8");
  if (!surveySource.includes("runOpenLinkPage")) {
    throw new Error(
      "app/survey/[slug]/page.tsx must delegate to runOpenLinkPage (S5 open link)",
    );
  }

  console.log(
    `check:proxy OK (${REQUIRED_MATCHERS.length} protected matchers, ${PUBLIC_ROUTE_PREFIXES.length} public prefixes excluded, ${PAGE_GUARDED_PUBLIC_PREFIXES.length} page-guarded link prefixes, ${REQUIRED_CLIENT_BYPASSES.length} client bypasses)`,
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
