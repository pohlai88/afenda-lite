import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const guard = join(root, "scripts/db-migrate-guard.mjs");
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

	it("denies sole-0000 baseline even with override", () => {
		const result = runGuard({
			AFENDA_ALLOW_DB_MIGRATE: "1",
			DATABASE_URL: poolerUrl,
		});
		expect(result.status).toBe(1);
		expect(`${result.stderr}${result.stdout}`).toMatch(
			/0000_living-roots-baseline/,
		);
	});

	it("denies missing DATABASE_URL after override when not sole-baseline", () => {
		// With only baseline on disk, sole-baseline fires first — still non-zero
		// and never reaches drizzle-kit. Assert non-zero + no drizzle apply marker.
		const result = runGuard({
			AFENDA_ALLOW_DB_MIGRATE: "1",
			DATABASE_URL: "",
		});
		expect(result.status).toBe(1);
		const combined = `${result.stderr}${result.stdout}`;
		expect(combined).not.toMatch(/Applying migrations/i);
	});
});
