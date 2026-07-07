import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

config();

const { Pool } = pg;

function getDatabasePoolConfig(connectionString) {
  let connectionStringForPool = connectionString;
  if (connectionString?.includes("supabase.com")) {
    try {
      const parsed = new URL(connectionString);
      parsed.searchParams.delete("sslmode");
      connectionStringForPool = parsed.toString();
    } catch {
      connectionStringForPool = connectionString;
    }
  }
  return {
    connectionString: connectionStringForPool,
    ssl: connectionString?.includes("supabase.com")
      ? { rejectUnauthorized: false }
      : undefined,
  };
}

const pool = new Pool(getDatabasePoolConfig(process.env.DATABASE_URL));
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data: users, error } = await admin.auth.admin.listUsers({ perPage: 50 });
if (error) throw error;

console.log("auth users:");
for (const user of users.users) {
  console.log({
    id: user.id,
    email: user.email,
    role: user.app_metadata?.role ?? null,
    confirmed: user.email_confirmed_at != null,
  });
}

const profiles = await pool.query(
  "SELECT user_id, onboarding_complete, updated_at FROM client_profiles ORDER BY updated_at DESC LIMIT 20",
);
console.log("\nclient_profiles:", profiles.rows);

await pool.end();
