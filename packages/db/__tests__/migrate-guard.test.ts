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

	it("keeps one 0000_* baseline plus forward additive SQL", () => {
		const sqlFiles = readdirSync(drizzleDir)
			.filter((f) => f.endsWith(".sql"))
			.toSorted();
		const baselines = sqlFiles.filter((f) => /^0000_.+\.sql$/.test(f));
		expect(baselines).toHaveLength(1);
		expect(sqlFiles.some((f) => /^0001_.+\.sql$/.test(f))).toBe(true);
	});

	it("denies missing DATABASE_URL when migrate allow is set", () => {
		const result = runGuard({
			AFENDA_ALLOW_DB_MIGRATE: "1",
			AFENDA_ALLOW_BASELINE_MIGRATE: "",
			DATABASE_URL: "",
		});
		expect(result.status).toBe(1);
		const combined = `${result.stderr}${result.stdout}`;
		expect(combined).toMatch(/DATABASE_URL/);
		expect(combined).not.toMatch(/Applying migrations/i);
	});

	it("denies missing DATABASE_URL when both migrate allows are set", () => {
		const result = runGuard({
			AFENDA_ALLOW_DB_MIGRATE: "1",
			AFENDA_ALLOW_BASELINE_MIGRATE: "1",
			DATABASE_URL: "",
		});
		expect(result.status).toBe(1);
		const combined = `${result.stderr}${result.stdout}`;
		expect(combined).toMatch(/DATABASE_URL/);
		expect(combined).not.toMatch(/Applying migrations/i);
	});
});
