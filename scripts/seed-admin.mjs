import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env");
  try {
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
  } catch {
    return {};
  }
}

const env = loadEnvFile();

const email = process.env.SHARED_ADMIN_EMAIL ?? env.SHARED_ADMIN_EMAIL;
const password = process.env.SHARED_ADMIN_PASSWORD ?? env.SHARED_ADMIN_PASSWORD;
const name =
  process.env.SHARED_ADMIN_NAME ?? env.SHARED_ADMIN_NAME ?? "Portal Operator";
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !password || !supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing SHARED_ADMIN_EMAIL, SHARED_ADMIN_PASSWORD, NEXT_PUBLIC_SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  const { data: existingUsers, error: listError } =
    await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

  if (listError) {
    throw listError;
  }

  const existing = existingUsers.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase(),
  );

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      app_metadata: { role: "admin" },
      user_metadata: { full_name: name, name },
    });

    if (error) {
      throw error;
    }

    console.log(`Updated shared admin account for ${email}`);
    return;
  }

  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { full_name: name, name },
  });

  if (error) {
    throw error;
  }

  console.log(`Created shared admin account for ${email}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
