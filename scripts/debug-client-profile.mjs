import { config } from "dotenv";
import pg from "pg";
import { getPgPoolConfig } from "./db-pool-config.mjs";

config();

const pool = new pg.Pool(getPgPoolConfig(process.env.DATABASE_URL));

const users = await pool.query(
  `SELECT id, email, role, "emailVerified", name
   FROM neon_auth."user"
   ORDER BY email`,
);

console.log("neon_auth users:");
for (const user of users.rows) {
  console.log({
    id: user.id,
    email: user.email,
    role: user.role,
    verified: user.emailVerified,
    name: user.name,
  });
}

const profiles = await pool.query(
  "SELECT user_id, onboarding_complete, updated_at FROM client_profiles ORDER BY updated_at DESC LIMIT 20",
);
console.log("\nclient_profiles:", profiles.rows);

await pool.end();
