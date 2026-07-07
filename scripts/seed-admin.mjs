import { loadEnvFile, getEnv } from "./lib/load-env.mjs";
import pg from "pg";
import { getPgPoolConfig } from "./db-pool-config.mjs";
import { ensureNeonAdminUser } from "./lib/neon-auth-seed.mjs";

const env = loadEnvFile();

const email = getEnv("SHARED_ADMIN_EMAIL", env);
const password = getEnv("SHARED_ADMIN_PASSWORD", env);
const name = getEnv("SHARED_ADMIN_NAME", env) ?? "Portal Operator";
const databaseUrl = getEnv("DATABASE_URL", env);
const authBaseUrl = getEnv("NEON_AUTH_BASE_URL", env);
const cookieSecret = getEnv("NEON_AUTH_COOKIE_SECRET", env);

if (!email || !password || !databaseUrl || !authBaseUrl || !cookieSecret) {
  console.error(
    "Missing SHARED_ADMIN_EMAIL, SHARED_ADMIN_PASSWORD, DATABASE_URL, NEON_AUTH_BASE_URL, or NEON_AUTH_COOKIE_SECRET",
  );
  process.exit(1);
}

const pool = new pg.Pool(getPgPoolConfig(databaseUrl));

async function main() {
  await ensureNeonAdminUser({
    pool,
    email,
    password,
    name,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
