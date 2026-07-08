#!/usr/bin/env node
/**
 * Launches shadcn-studio-mcp with credentials from env.secret + env.config.
 * Used by .cursor/mcp.json so API keys are not committed to MCP config files.
 */
import { spawn } from "node:child_process";
import { parseEnvFile } from "./lib/env-files.mjs";

const apiKey = parseEnvFile("env.secret").SHADCN_STUDIO_API_KEY;
const email =
  parseEnvFile("env.config").SHADCN_STUDIO_EMAIL ??
  parseEnvFile("env.config").EMAIL;

if (!apiKey || !email) {
  console.error(
    "Missing SHADCN_STUDIO_API_KEY (env.secret) or SHADCN_STUDIO_EMAIL (env.config).",
  );
  console.error("Copy env.secret.example / env.config.example, then npm run env:compose.");
  process.exit(1);
}

const args = [
  "-y",
  "shadcn-studio-mcp",
  `API_KEY=${apiKey}`,
  `EMAIL=${email}`,
];

const child = spawn("npx", args, {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    API_KEY: apiKey,
    EMAIL: email,
    LICENSE_KEY: parseEnvFile("env.secret").LICENSE_KEY ?? apiKey,
  },
});

child.on("exit", (code) => process.exit(code ?? 0));
