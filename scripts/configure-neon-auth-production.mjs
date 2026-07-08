/**
 * Neon Auth production branch configuration via Neon Management API.
 * Requires NEON_API_KEY with access to the linked project (org org-royal-bar-40022480).
 *
 * Usage:
 *   npm run configure:neon-auth-production -- --sync-trusted-domains
 *   npm run configure:neon-auth-production -- --configure-plugins
 *   npm run configure:neon-auth-production -- --disable-localhost
 *   npm run configure:neon-auth-production -- --dry-run --configure-plugins
 */
import { execFileSync } from "node:child_process";
import { loadComposedEnv, getEnvValue } from "./lib/env-files.mjs";

const env = loadComposedEnv();
const apiKey = getEnvValue("NEON_API_KEY", env);
const projectId = getEnvValue("NEON_PROJECT_ID", env);
const branchId = getEnvValue("NEON_BRANCH_ID", env);
const appUrl = (getEnvValue("APP_URL", env) ?? "https://iam-check.vercel.app").replace(
  /\/$/,
  "",
);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const syncTrusted = args.includes("--sync-trusted-domains");
const configurePlugins = args.includes("--configure-plugins");
const disableLocalhost = args.includes("--disable-localhost");
const addTrustedArgIndex = args.indexOf("--add-trusted-origin");
const addTrustedOrigin =
  addTrustedArgIndex >= 0 ? args[addTrustedArgIndex + 1]?.trim() : undefined;

if (!syncTrusted && !disableLocalhost && !addTrustedOrigin && !configurePlugins) {
  console.error(
    "Specify an action: --sync-trusted-domains | --configure-plugins | --disable-localhost | --add-trusted-origin <url>",
  );
  process.exit(1);
}

if (!apiKey || !projectId || !branchId) {
  console.error(
    "Missing NEON_API_KEY, NEON_PROJECT_ID, or NEON_BRANCH_ID. Run npm run env:compose first.",
  );
  process.exit(1);
}

const neonArgs = ["--project-id", projectId, "--branch", branchId, "-o", "json"];
const apiBase = `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}/auth`;

function runNeon(commandArgs) {
  if (dryRun) {
    console.log("[dry-run]", "npx neon@latest", ...commandArgs, ...neonArgs);
    return "";
  }
  try {
    return execFileSync("npx", ["neon@latest", ...commandArgs, ...neonArgs], {
      env: { ...process.env, NEON_API_KEY: apiKey },
      encoding: "utf8",
      shell: true,
    });
  } catch (error) {
    const stderr = error.stderr?.toString?.() ?? "";
    if (
      commandArgs[0] === "neon-auth" &&
      commandArgs[1] === "domain" &&
      commandArgs[2] === "add" &&
      (stderr.includes("DOMAIN_ALREADY_EXISTS") || stderr.includes("Domain already exists"))
    ) {
      console.log("Trusted domain already configured — skipping.");
      return "";
    }
    throw error;
  }
}

async function patchPlugin(path, body, label) {
  const url = `${apiBase}/plugins/${path}`;
  if (dryRun) {
    console.log("[dry-run] PATCH", url, body);
    return;
  }
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.text();
  if (!response.ok) {
    console.error(`${label} configure failed (${response.status}):`, payload);
    process.exit(1);
  }
  console.log(`${label} configured:`, body);
}

if (syncTrusted || addTrustedOrigin) {
  const origin = addTrustedOrigin ?? appUrl;
  console.log(`Adding trusted domain: ${origin}`);
  runNeon(["neon-auth", "domain", "add", origin]);
}

if (disableLocalhost) {
  console.log("Disabling allow_localhost (production cutover)");
  runNeon(["neon-auth", "domain", "allow-localhost", "disable"]);
}

if (configurePlugins) {
  await patchPlugin(
    "magic-link",
    { enabled: true, expires_in: 15, disable_sign_up: true },
    "Magic Link",
  );
  await patchPlugin(
    "organization",
    {
      enabled: true,
      organization_limit: 10,
      membership_limit: 100,
      creator_role: "owner",
      send_invitation_email: true,
    },
    "Organization",
  );
}

console.log("Done. Run npm run sync:neon-auth-manifest && npm run audit:neon-auth-production");
