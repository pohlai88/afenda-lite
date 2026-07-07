import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const ENV_FILE = resolve(ROOT, ".env");
const TARGETS = ["production", "preview", "development"];
const PREVIEW_BRANCH = process.env.VERCEL_PREVIEW_GIT_BRANCH ?? "main";
const UPSERT_KEYS = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];
const REMOVE_KEYS = ["NEON_AUTH_BASE_URL", "NEON_AUTH_COOKIE_SECRET"];

function loadEnvFile() {
  const content = readFileSync(ENV_FILE, "utf8");
  const env = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
  }

  return env;
}

function runVercel(args, input) {
  const result = spawnSync("vercel", args, {
    cwd: ROOT,
    encoding: "utf8",
    input,
    shell: process.platform === "win32",
  });

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (result.status !== 0) {
    throw new Error(`vercel ${args.join(" ")} failed: ${output}`);
  }

  return output;
}

function upsertEnv(key, target, value, previewBranch) {
  const args =
    target === "preview"
      ? ["env", "add", key, "preview", previewBranch, "--force", "--yes"]
      : ["env", "add", key, target, "--force", "--yes"];

  runVercel(args, `${value}\n`);
}

function main() {
  const env = loadEnvFile();

  for (const key of REMOVE_KEYS) {
    for (const target of TARGETS) {
      try {
        runVercel(["env", "rm", key, target, "-y"]);
        console.log(`Removed ${key} (${target})`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        if (message.includes("not found") || message.includes("Environment Variable was not found")) {
          console.log(`Skip remove ${key} (${target}) — not set`);
        } else {
          console.warn(message);
        }
      }
    }
  }

  for (const key of UPSERT_KEYS) {
    const value = env[key];
    if (!value) {
      throw new Error(`Missing ${key} in .env`);
    }

    for (const target of TARGETS) {
      if (target === "preview") {
        console.warn(
          `Skip ${key} (preview) — set in Vercel dashboard for all Preview branches (CLI requires git branch).`,
        );
        continue;
      }

      upsertEnv(key, target, value, PREVIEW_BRANCH);
      console.log(`Set ${key} (${target})`);
    }
  }

  console.log("Vercel Supabase env sync complete.");
}

main();
