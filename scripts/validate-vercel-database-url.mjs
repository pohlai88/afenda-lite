import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readDatabaseUrlFromFile(envFile) {
  const content = readFileSync(envFile, "utf8");
  const line = content
    .split(/\r?\n/)
    .find((entry) => entry.startsWith("DATABASE_URL="));

  if (!line) {
    return undefined;
  }

  const raw = line.slice("DATABASE_URL=".length).trim();
  if (!raw || raw === '""' || raw === "''") {
    return undefined;
  }

  return raw.replace(/^"|"$/g, "").replace(/^'|'$/g, "");
}

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) {
    return process.env.DATABASE_URL.trim();
  }

  const envFile =
    process.argv[2] ?? resolve(process.cwd(), ".env.vercel.production.check");

  try {
    return readDatabaseUrlFromFile(envFile);
  } catch {
    return undefined;
  }
}

const raw = resolveDatabaseUrl();
if (!raw) {
  console.error(
    "DATABASE_URL not found. Use `vercel env run --environment production -- node scripts/validate-vercel-database-url.mjs`",
  );
  process.exit(1);
}
let url;
try {
  url = new URL(raw);
} catch {
  console.error("DATABASE_URL is not a valid URL");
  process.exit(1);
}

const pooler = url.hostname.includes("-pooler");
const result = {
  host: url.hostname,
  pooler,
  sslmode: url.searchParams.get("sslmode"),
  database: url.pathname.replace(/^\//, ""),
  readyWouldBeDegraded: !pooler,
};

console.log(JSON.stringify(result, null, 2));
process.exit(pooler ? 0 : 1);
