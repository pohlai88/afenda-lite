import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Load composed `.env` into `process.env` when keys are unset.
 * CI and Playwright webServer inject vars directly — no file required.
 */
export function loadPlaywrightEnv(cwd = process.cwd()) {
  try {
    const content = readFileSync(resolve(cwd, ".env"), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim();
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // Local runs may rely on env.config/secret via shell; CI uses injected secrets.
  }
}
