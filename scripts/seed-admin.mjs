import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import pg from "pg";
import { hashPassword } from "../node_modules/@neondatabase/auth/node_modules/better-auth/dist/crypto/index.mjs";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
  const content = readFileSync(envPath, "utf8");
  const env = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }

  return env;
}

const env = loadEnv();

const email = env.SHARED_ADMIN_EMAIL;
const password = env.SHARED_ADMIN_PASSWORD;
const name = env.SHARED_ADMIN_NAME ?? "Portal Operator";
const databaseUrl = env.DATABASE_URL;

if (!email || !password || !databaseUrl) {
  console.error(
    "Missing SHARED_ADMIN_EMAIL, SHARED_ADMIN_PASSWORD, or DATABASE_URL in .env",
  );
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: databaseUrl.replace(
    /([?&]sslmode=)(prefer|require|verify-ca)(?=(&|$))/,
    "$1verify-full",
  ),
});

async function main() {
  const existing = await pool.query(
    `SELECT id FROM neon_auth."user" WHERE lower(email) = lower($1) LIMIT 1`,
    [email],
  );

  let userId = existing.rows[0]?.id;

  if (!userId) {
    userId = randomUUID();
    const passwordHash = await hashPassword(password);

    await pool.query("BEGIN");
    try {
      await pool.query(
        `INSERT INTO neon_auth."user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt", role)
         VALUES ($1, $2, $3, true, NULL, NOW(), NOW(), 'admin')`,
        [userId, name, email],
      );

      await pool.query(
        `INSERT INTO neon_auth.account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
         VALUES ($1, $2, 'credential', $3, $4, NOW(), NOW())`,
        [randomUUID(), userId, userId, passwordHash],
      );

      await pool.query("COMMIT");
      console.log(`Created shared admin account for ${email}`);
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  } else {
    await pool.query(
      `UPDATE neon_auth."user"
       SET role = 'admin', "emailVerified" = true, name = $2
       WHERE id = $1`,
      [userId, name],
    );

    const passwordHash = await hashPassword(password);
    const account = await pool.query(
      `SELECT id FROM neon_auth.account
       WHERE "userId" = $1 AND "providerId" = 'credential'
       LIMIT 1`,
      [userId],
    );

    if (account.rows[0]) {
      await pool.query(
        `UPDATE neon_auth.account SET password = $2, "updatedAt" = NOW() WHERE id = $1`,
        [account.rows[0].id, passwordHash],
      );
    } else {
      await pool.query(
        `INSERT INTO neon_auth.account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
         VALUES ($1, $2, 'credential', $3, $4, NOW(), NOW())`,
        [randomUUID(), userId, userId, passwordHash],
      );
    }

    console.log(`Updated shared admin account for ${email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
