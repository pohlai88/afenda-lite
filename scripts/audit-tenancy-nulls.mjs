/**
 * N9 / ARCH-023 — assert zero null `organization_id` on hard tenant roots.
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
	"platform_role_assignment",
	"platform_rbac_audit",
	"platform_audit_log",
	"platform_search_document",
	"platform_notification",
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
	platform_role_assignment: () =>
		sql`SELECT count(*)::int AS null_count FROM platform_role_assignment WHERE organization_id IS NULL`,
	platform_rbac_audit: () =>
		sql`SELECT count(*)::int AS null_count FROM platform_rbac_audit WHERE organization_id IS NULL`,
	platform_audit_log: () =>
		sql`SELECT count(*)::int AS null_count FROM platform_audit_log WHERE organization_id IS NULL`,
	platform_search_document: () =>
		sql`SELECT count(*)::int AS null_count FROM platform_search_document WHERE organization_id IS NULL`,
	platform_notification: () =>
		sql`SELECT count(*)::int AS null_count FROM platform_notification WHERE organization_id IS NULL`,
};

console.log(
	`audit:tenancy-nulls — ${HARD_TENANT_ROOT_TABLE_NAMES.length} hard tenant roots (ARCH-023)`,
);

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
	if (ok) {
		console.log(`  OK    ${table}: null_count=0`);
	} else {
		console.error(`  FAIL  ${table}: null_count=${nullCount}`);
		failed += 1;
	}
}

if (failed > 0) {
	console.error(`audit:tenancy-nulls FAIL — ${failed} table(s)`);
	process.exit(1);
}

console.log("audit:tenancy-nulls PASS");
