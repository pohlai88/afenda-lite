import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Post-S4.1 / ARCH-027 — only local runtime file for Next + ops scripts. */
export const ENV_LOCAL_PATH = ".env.local";

export function parseEnvContent(content) {
  const env = {};
  const lines = [];

  for (const line of content.split("\n")) {
    lines.push(line);
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const index = trimmed.indexOf("=");
    if (index === -1) {
      continue;
    }
    env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }

  return { env, lines };
}

export function parseEnvFile(path) {
  try {
    const content = readFileSync(resolve(process.cwd(), path), "utf8");
    return parseEnvContent(content).env;
  } catch {
    return {};
  }
}

/** Load gitignored `.env.local` for ops scripts (never compose). */
export function loadLocalEnv() {
  return parseEnvFile(ENV_LOCAL_PATH);
}

/**
 * Prefer `.env.local` over shell exports so stale process env cannot win.
 */
export function getEnvValue(key, fileEnv = loadLocalEnv()) {
  if (fileEnv[key]) {
    return fileEnv[key];
  }
  return process.env[key];
}
