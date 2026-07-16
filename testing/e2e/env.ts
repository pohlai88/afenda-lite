import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Playwright env bootstrap.
 * Loads repo-root `.env.local` into `process.env` when keys are unset, then
 * fills `PLAYWRIGHT_BASE_URL` default.
 */
export function loadPlaywrightEnv(): void {
	const envPath = resolve(process.cwd(), ".env.local");
	if (existsSync(envPath)) {
		for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) {
				continue;
			}
			const eq = trimmed.indexOf("=");
			if (eq <= 0) {
				continue;
			}
			const key = trimmed.slice(0, eq).trim();
			let value = trimmed.slice(eq + 1).trim();
			if (
				(value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))
			) {
				value = value.slice(1, -1);
			}
			if (process.env[key] === undefined) {
				process.env[key] = value;
			}
		}
	}

	if (!process.env.PLAYWRIGHT_BASE_URL) {
		process.env.PLAYWRIGHT_BASE_URL = "http://localhost:3000";
	}
}
