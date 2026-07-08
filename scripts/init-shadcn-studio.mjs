#!/usr/bin/env node
/**
 * Initialize Shadcn Studio for this project:
 * 1. Compose env (LICENSE_KEY, EMAIL, SHADCN_STUDIO_*)
 * 2. Install user-level Cursor MCP via official CLI
 * 3. Verify project MCP launcher + components.json registries
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { composeEnv, parseEnvFile } from "./lib/env-files.mjs";

const root = process.cwd();

composeEnv();

const apiKey = parseEnvFile("env.secret").SHADCN_STUDIO_API_KEY;
const email =
  parseEnvFile("env.config").SHADCN_STUDIO_EMAIL ??
  parseEnvFile("env.config").EMAIL;
const licenseKey = parseEnvFile("env.secret").LICENSE_KEY;

if (!apiKey || !email) {
  console.error(
    "Missing Shadcn Studio credentials. Set in env.secret / env.config:",
  );
  console.error("  SHADCN_STUDIO_API_KEY, LICENSE_KEY (env.secret)");
  console.error("  SHADCN_STUDIO_EMAIL, EMAIL (env.config)");
  process.exit(1);
}

console.log("Installing Shadcn Studio MCP for Cursor (user ~/.cursor/mcp.json)...");
const install = spawnSync(
  "npx",
  [
    "-y",
    "shadcn-studio-cli",
    "install",
    "cursor",
    "--api-key",
    apiKey,
    "--email",
    email,
  ],
  { stdio: "inherit", shell: true },
);

if (install.status !== 0) {
  process.exit(install.status ?? 1);
}

const componentsJson = resolve(root, "components.json");
if (!existsSync(componentsJson)) {
  console.error("components.json not found — run shadcn init first.");
  process.exit(1);
}

console.log("\nShadcn Studio initialized.");
console.log("  Project MCP:  node scripts/shadcn-studio-mcp.mjs  (via .cursor/mcp.json)");
console.log("  User MCP:     shadcn-studio-mcp in ~/.cursor/mcp.json");
console.log("  Registries:   @ss-blocks, @ss-components in components.json");
console.log(`  License:      ${licenseKey ? "set" : "missing LICENSE_KEY"}`);
console.log("\nRestart Cursor, then enable the shadcn-studio MCP server.");
