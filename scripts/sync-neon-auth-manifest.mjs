import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { loadEnvFile, getEnv } from "./lib/load-env.mjs";
import {
  buildNeonAuthManifest,
  parseJsonOutput,
} from "./lib/neon-auth-manifest-build.mjs";

const env = loadEnvFile();
const projectId = getEnv("NEON_PROJECT_ID", env);
const branchId = getEnv("NEON_BRANCH_ID", env);
const apiKey = getEnv("NEON_API_KEY", env);

if (!projectId || !branchId || !apiKey) {
  console.error("Missing NEON_PROJECT_ID, NEON_BRANCH_ID, or NEON_API_KEY");
  process.exit(1);
}

const neonArgs = ["--project-id", projectId, "--branch", branchId, "-o", "json"];

function runNeon(args) {
  try {
    const stdout = execFileSync("npx", ["neon@latest", ...args, ...neonArgs], {
      env: { ...process.env, NEON_API_KEY: apiKey },
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      shell: true,
    });
    return stdout.trim();
  } catch (error) {
    const stderr = error.stderr?.toString?.() ?? "";
    if (stderr.includes("project not found") || stderr.includes("not configured")) {
      console.error(
        [
          "Neon CLI could not read auth config for this project/branch.",
          "Regenerate NEON_API_KEY for org org-royal-bar-40022480 (Neon Console → Account → API keys),",
          "update env.secret, run npm run env:compose, then retry.",
          "For a one-off refresh, use Neon MCP get_neon_auth_config and update config/neon-auth.manifest.json.",
        ].join("\n"),
      );
    }
    throw error;
  }
}

function main() {
  const neonFile = JSON.parse(readFileSync(".neon", "utf8"));
  const existing = JSON.parse(
    readFileSync("config/neon-auth.manifest.json", "utf8"),
  );

  const status = runNeon(["neon-auth", "status"]);
  const emailPassword = runNeon(["neon-auth", "config", "email-password", "get"]);
  const emailProvider = runNeon(["neon-auth", "config", "email-provider", "get"]);
  const trustedDomains = runNeon(["neon-auth", "domain", "list"]);
  const oauthProvidersRaw = runNeon(["neon-auth", "oauth-provider", "list"]);

  let magicLinkJson = null;
  let organizationJson = null;
  try {
    magicLinkJson = parseJsonOutput(
      runNeon(["neon-auth", "plugins", "get", "magic_link"]),
    );
  } catch {
    magicLinkJson = existing.plugins?.magicLink ?? null;
  }
  try {
    organizationJson = parseJsonOutput(
      runNeon(["neon-auth", "plugins", "get", "organization"]),
    );
  } catch {
    organizationJson = existing.plugins?.organization ?? null;
  }

  const manifest = buildNeonAuthManifest({
    neonFile,
    existing,
    statusJson: parseJsonOutput(status),
    emailPasswordJson: parseJsonOutput(emailPassword),
    emailProviderJson: parseJsonOutput(emailProvider),
    domainsJson: parseJsonOutput(trustedDomains),
    oauthProvidersJson: parseJsonOutput(oauthProvidersRaw),
    magicLinkJson,
    organizationJson,
  });

  writeFileSync(
    "config/neon-auth.manifest.json",
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  console.log("Updated config/neon-auth.manifest.json");
  console.log(`  baseUrl: ${manifest.integration.baseUrl}`);
  console.log(`  trustedDomains: ${manifest.trustedDomains.join(", ")}`);
  console.log(
    `  oauthProviders: ${manifest.oauthProviders.map((entry) => entry.id).join(", ") || "(none)"}`,
  );
  console.log(`  ui.social: ${manifest.ui.features.social}`);
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
