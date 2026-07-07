/**
 * Reproduce post-login client route failure locally.
 * Usage: node scripts/repro-client-login.mjs [email] [password]
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config();

const email = process.argv[2] ?? process.env.PREVIEW_CLIENT_EMAIL;
const password = process.argv[3] ?? process.env.PREVIEW_CLIENT_PASSWORD;
const baseUrl = process.argv[4] ?? "http://localhost:3000";

if (!email || !password) {
  console.error("Usage: node scripts/repro-client-login.mjs [email] [password] [baseUrl]");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

const { data, error } = await supabase.auth.signInWithPassword({ email, password });
if (error) {
  console.error("signIn failed:", error.message);
  process.exit(1);
}

console.log("signed in as", data.user?.email, data.user?.id);

const sessionResp = await supabase.auth.getSession();
const accessToken = sessionResp.data.session?.access_token;
const refreshToken = sessionResp.data.session?.refresh_token;

if (!accessToken || !refreshToken) {
  console.error("no session tokens");
  process.exit(1);
}

// Supabase SSR cookie format used by @supabase/ssr
const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const cookieName = `sb-${projectRef}-auth-token`;
const cookieValue = encodeURIComponent(
  JSON.stringify([accessToken, refreshToken, null, null, null]),
);

const paths = ["/client/onboarding", "/client", "/client/profile"];

for (const path of paths) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Cookie: `${cookieName}=${cookieValue}` },
    redirect: "manual",
  });
  const body = await response.text();
  const hasErrorUi = body.includes("Something went wrong");
  const hasOnboarding = body.includes("Declarant onboarding") || body.includes("onboarding");
  const hasDashboard = body.includes("Your declarations") || body.includes("Declaration dashboard");
  console.log({
    path,
    status: response.status,
    location: response.headers.get("location"),
    hasErrorUi,
    hasOnboarding,
    hasDashboard,
    snippet: body.replace(/\s+/g, " ").slice(0, 200),
  });
}

await supabase.auth.signOut();
