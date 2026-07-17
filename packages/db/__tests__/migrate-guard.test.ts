import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const guard = join(root, "scripts/db-migrate-guard.mjs");
const drizzleDir = join(root, "drizzle");
const poolerUrl =
	"postgresql://u:p@ep-example-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb";

function runGuard(env: NodeJS.ProcessEnv) {
	return spawnSync(process.execPath, [guard], {
		encoding: "utf8",
		env: { ...process.env, ...env },
		cwd: root,
	});
}

describe("db-migrate-guard", () => {
	it("denies without AFENDA_ALLOW_DB_MIGRATE", () => {
		const result = runGuard({
			AFENDA_ALLOW_DB_MIGRATE: "",
			DATABASE_URL: poolerUrl,
		});
		expect(result.status).toBe(1);
		expect(`${result.stderr}${result.stdout}`).toMatch(/DENIED/);
	});

	it("has forward migrations beyond sole 0000 baseline (N12)", () => {
		const sqlFiles = readdirSync(drizzleDir).filter((f) => f.endsWith(".sql"));
		expect(sqlFiles).toContain("0000_living-roots-baseline.sql");
		expect(sqlFiles.some((f) => f.startsWith("0001_"))).toBe(true);
		expect(sqlFiles.length).toBeGreaterThan(1);
	});

	it("denies missing DATABASE_URL after override when forward migrations exist", () => {
		const result = runGuard({
			AFENDA_ALLOW_DB_MIGRATE: "1",
			DATABASE_URL: "",
		});
		expect(result.status).toBe(1);
		const combined = `${result.stderr}${result.stdout}`;
		expect(combined).toMatch(/DATABASE_URL/);
		expect(combined).not.toMatch(/Applying migrations/i);
		expect(combined).not.toMatch(
			/The only migration is 0000_living-roots-baseline/,
		);
	});
});
