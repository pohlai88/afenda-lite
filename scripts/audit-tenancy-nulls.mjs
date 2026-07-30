/**
 * N9 / ARCH-023 — assert zero null `organization_id` on hard tenant roots.
 *
 * The inventory is parsed from the single typed registry in
 * `packages/data-plane/db/src/hard-tenant-roots.ts`; this Node operation does
 * not import TypeScript schema modules or maintain an inventory mirror.
 *
 * Usage: pnpm audit:tenancy-nulls
 * Requires DATABASE_URL (pooled product URL from `.env.local`).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { getEnvValue, loadLocalEnv } from "./lib/env-files.mjs";
import { parseHardTenantRootEntries } from "./lib/hard-tenant-root-registry.mjs";

const HARD_ROOTS_PATH = resolve(
	process.cwd(),
	"packages/data-plane/db/src/hard-tenant-roots.ts",
);
const HARD_TENANT_ROOT_TABLE_NAMES = parseHardTenantRootEntries(
	readFileSync(HARD_ROOTS_PATH, "utf8"),
).map((entry) => entry.sqlName);

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
		"packages/data-plane/db/node_modules/@neondatabase/serverless/index.mjs",
	),
).href;
const { neon } = await import(serverlessUrl);
const sql = neon(databaseUrl.trim());

const TRUSTED_SQL_IDENTIFIER_PATTERN = /^[a-z][a-z0-9_]*$/;

function nullOrganizationCountQuery(tableName) {
	if (!TRUSTED_SQL_IDENTIFIER_PATTERN.test(tableName)) {
		throw new Error(`Invalid hard-tenant SQL identifier: ${tableName}`);
	}
	return sql.query(
		`SELECT count(*)::int AS null_count FROM "${tableName}" WHERE organization_id IS NULL`,
	);
}

console.log(
	`audit:tenancy-nulls — ${HARD_TENANT_ROOT_TABLE_NAMES.length} hard tenant roots (ARCH-023)`,
);

const MISSING_RELATION_PATTERN = /relation .* does not exist/i;

function isUndefinedTable(error) {
	let current = error;
	for (
		let depth = 0;
		depth < 4 && current !== null && current !== undefined;
		depth += 1
	) {
		if (
			typeof current === "object" &&
			"code" in current &&
			current.code === "42P01"
		) {
			return true;
		}
		if (
			current instanceof Error &&
			MISSING_RELATION_PATTERN.test(current.message)
		) {
			return true;
		}
		current =
			typeof current === "object" && current !== null && "cause" in current
				? current.cause
				: null;
	}
	return false;
}

let failed = 0;
let skipped = 0;

for (const table of HARD_TENANT_ROOT_TABLE_NAMES) {
	let result;
	try {
		result = await nullOrganizationCountQuery(table);
	} catch (error) {
		if (isUndefinedTable(error)) {
			console.log(`  SKIP  ${table}: relation not present (pending migration)`);
			skipped += 1;
			continue;
		}
		throw error;
	}
	const nullCount = Number(result[0]?.null_count ?? 0);
	if (nullCount === 0) {
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

if (skipped > 0) {
	console.log(
		`audit:tenancy-nulls PASS — ${HARD_TENANT_ROOT_TABLE_NAMES.length - skipped} audited, ${skipped} skipped (pending DDL)`,
	);
} else {
	console.log("audit:tenancy-nulls PASS");
}
