/**
 * N9 / ARCH-023 — assert zero null `organization_id` on the eight hard tenant roots.
 *
 * Table inventory matches `HARD_TENANT_ROOT_TABLE_NAMES` in
 * `packages/db/src/hard-tenant-roots.ts` (kept as a plain list here so Node
 * can run without resolving Drizzle TS extensionless imports).
 *
 * Usage: pnpm audit:tenancy-nulls
 * Requires DATABASE_URL (pooled product URL from `.env.local`).
 */

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { getEnvValue, loadLocalEnv } from "./lib/env-files.mjs";

/** ARCH-023 · RB-001 §3.4 — must stay aligned with HARD_TENANT_ROOT_TABLE_NAMES. */
const HARD_TENANT_ROOT_TABLE_NAMES = [
	"surveys",
	"client_invitations",
	"client_profiles",
	"client_assignments",
	"fft_event",
	"fft_sales_member",
	"fft_role",
	"fft_role_assignment",
];

const fileEnv = loadLocalEnv();
const databaseUrl = getEnvValue("DATABASE_URL", fileEnv);

if (!databaseUrl || databaseUrl.trim().length === 0) {
	console.error(
		"audit:tenancy-nulls FAIL — DATABASE_URL missing (set in .env.local)",
	);
	process.exit(1);
}

const serverlessUrl = pathToFileURL(
	resolve(
		process.cwd(),
		"packages/db/node_modules/@neondatabase/serverless/index.mjs",
	),
).href;
const { neon } = await import(serverlessUrl);
const sql = neon(databaseUrl.trim());

/** Fixed tagged queries — table names never interpolated from user input. */
const NULL_COUNT_BY_TABLE = {
	surveys: () =>
		sql`SELECT count(*)::int AS null_count FROM surveys WHERE organization_id IS NULL`,
	client_invitations: () =>
		sql`SELECT count(*)::int AS null_count FROM client_invitations WHERE organization_id IS NULL`,
	client_profiles: () =>
		sql`SELECT count(*)::int AS null_count FROM client_profiles WHERE organization_id IS NULL`,
	client_assignments: () =>
		sql`SELECT count(*)::int AS null_count FROM client_assignments WHERE organization_id IS NULL`,
	fft_event: () =>
		sql`SELECT count(*)::int AS null_count FROM fft_event WHERE organization_id IS NULL`,
	fft_sales_member: () =>
		sql`SELECT count(*)::int AS null_count FROM fft_sales_member WHERE organization_id IS NULL`,
	fft_role: () =>
		sql`SELECT count(*)::int AS null_count FROM fft_role WHERE organization_id IS NULL`,
	fft_role_assignment: () =>
		sql`SELECT count(*)::int AS null_count FROM fft_role_assignment WHERE organization_id IS NULL`,
};

console.log("audit:tenancy-nulls — eight hard tenant roots (ARCH-023)");

let failed = 0;

for (const table of HARD_TENANT_ROOT_TABLE_NAMES) {
	const query = NULL_COUNT_BY_TABLE[table];
	if (typeof query !== "function") {
		console.error(`  FAIL  ${table}: no query registered`);
		failed += 1;
		continue;
	}
	const result = await query();
	const nullCount = Number(result[0]?.null_count ?? 0);
	const ok = nullCount === 0;
	if (!ok) {
		failed += 1;
	}
	console.log(`  ${ok ? "PASS" : "FAIL"}  ${table}: null_org=${nullCount}`);
}

if (failed > 0) {
	console.error(
		`audit:tenancy-nulls FAIL — ${failed} table(s) have null organization_id`,
	);
	process.exit(1);
}

console.log("audit:tenancy-nulls PASS — zero nulls on eight hard tenant roots");
process.exit(0);
