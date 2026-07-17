/**
 * N10 — release seed path for ARCH-023 v1 platform permission catalog.
 *
 * Idempotent upsert via ensurePlatformPermissionCatalog (typed SSOT).
 * Not drizzle baseline migrate — never apply 0000_* on br-tiny-hill-ao82jp6f.
 *
 * Usage: pnpm --filter @afenda/db db:ensure-permission-catalog
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(packageRoot, "../..");

function loadEnvLocal() {
	if (process.env.DATABASE_URL) {
		return;
	}
	const envPath = join(repoRoot, ".env.local");
	if (!existsSync(envPath)) {
		return;
	}
	const text = readFileSync(envPath, "utf8");
	for (const line of text.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
		const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed);
		if (!match) continue;
		const key = match[1];
		let value = match[2]?.trim() ?? "";
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

loadEnvLocal();

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim().length === 0) {
	console.error(
		"@afenda/db db:ensure-permission-catalog DENIED: DATABASE_URL is required (env or repo-root .env.local)",
	);
	process.exit(1);
}

const runner = join(
	packageRoot,
	"scripts/ensure-platform-permission-catalog-run.ts",
);

const result = spawnSync("pnpm", ["exec", "tsx", runner], {
	cwd: packageRoot,
	stdio: "inherit",
	shell: true,
	env: process.env,
});

process.exit(result.status ?? 1);
