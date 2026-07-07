import { readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const PROXY_FILE = join(ROOT, "proxy.ts");

const REQUIRED_MATCHERS = [
  '"/"',
  '"/account/:path*"',
  '"/dashboard/:path*"',
  '"/client/:path*"',
  '"/org/:path*"',
  '"/survey/:path*"',
  '"/playground/:path*"',
];

const PUBLIC_ROUTE_PREFIXES = [
  "/api/auth/",
  "/api/health/",
  "/auth/",
  "/f/",
  "/invite/",
];

function main() {
  const source = readFileSync(PROXY_FILE, "utf8");
  const missing = REQUIRED_MATCHERS.filter((matcher) => !source.includes(matcher));

  if (missing.length > 0) {
    throw new Error(
      `proxy.ts is missing required matchers: ${missing.join(", ")}`,
    );
  }

  for (const prefix of PUBLIC_ROUTE_PREFIXES) {
    if (source.includes(`"${prefix}`) || source.includes(`'${prefix}`)) {
      throw new Error(
        `proxy.ts must not match public route prefix ${prefix}`,
      );
    }
  }

  if (!source.includes("export default async function proxy")) {
    throw new Error("proxy.ts must export the Next.js 16 proxy handler.");
  }

  console.log(
    `check:proxy OK (${REQUIRED_MATCHERS.length} protected matchers, ${PUBLIC_ROUTE_PREFIXES.length} public prefixes excluded)`,
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
