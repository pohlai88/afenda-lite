/**
 * Read-only: compare Drizzle journal on disk vs drizzle.__drizzle_migrations on Neon.
 * Does not apply migrations or mutate the ledger.
 *
 * Authority: N2 · ARCH-028 S2.2
 */
import crypto from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";

import { assertMigrationJournal } from "./lib/assert-migration-journal.mjs";
import { requireMigrationDatabaseUrl } from "./lib/database-url.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "../../..");
const drizzleDir = join(root, "drizzle");

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

if (!existsSync(drizzleDir)) {
	console.error(
		"@afenda/db db:migration-status: missing packages/data-plane/db/drizzle/",
	);
	process.exit(1);
}

const journalAssert = assertMigrationJournal(drizzleDir);
if (!journalAssert.ok) {
	console.error("@afenda/db db:migration-status: journal assert FAILED:");
	for (const issue of journalAssert.issues) {
		console.error(`  - ${issue}`);
	}
	process.exit(1);
}

/** @type {{ entries: Array<{ idx: number, tag: string, when: number }> }} */
const journal = JSON.parse(
	readFileSync(join(drizzleDir, "meta", "_journal.json"), "utf8"),
);

const journalRows = journal.entries.map((entry) => {
	const sql = readFileSync(join(drizzleDir, `${entry.tag}.sql`), "utf8");
	return {
		idx: entry.idx,
		tag: entry.tag,
		when: entry.when,
		hash: crypto.createHash("sha256").update(sql).digest("hex"),
	};
});

let databaseUrl;
try {
	databaseUrl = requireMigrationDatabaseUrl(process.env);
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`@afenda/db db:migration-status: ${message}`);
	process.exit(1);
}

const sql = neon(databaseUrl);

/** @type {Array<{ hash: string, created_at: string | number }>} */
let dbRows;
try {
	dbRows = await sql`
		SELECT hash, created_at
		FROM drizzle.__drizzle_migrations
		ORDER BY created_at ASC, id ASC
	`;
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	console.error(
		`@afenda/db db:migration-status: could not read drizzle.__drizzle_migrations: ${message}`,
	);
	process.exit(1);
}

const dbByCreatedAt = new Map(
	dbRows.map((row) => [Number(row.created_at), String(row.hash)]),
);
const dbHashes = new Set(dbRows.map((row) => String(row.hash)));

let appliedThroughTag = null;
let pendingCount = 0;
const issues = [];

for (const row of journalRows) {
	const dbHash = dbByCreatedAt.get(row.when);
	if (dbHash === row.hash) {
		appliedThroughTag = row.tag;
		continue;
	}
	if (dbHashes.has(row.hash)) {
		issues.push(
			`hash present in DB but created_at mismatch for ${row.tag} (journal when=${row.when})`,
		);
		pendingCount += 1;
		continue;
	}
	pendingCount += 1;
}

console.log("@afenda/db db:migration-status:");
console.log(`  journal entries: ${journalRows.length}`);
console.log(`  db ledger rows:  ${dbRows.length}`);
console.log(
	`  applied through:   ${appliedThroughTag ?? "(none detected by hash+when)"}`,
);
console.log(`  pending forward: ${pendingCount}`);

if (issues.length > 0) {
	console.error("  drift:");
	for (const issue of issues) {
		console.error(`    - ${issue}`);
	}
	process.exit(1);
}

if (pendingCount > 0) {
	console.log(
		"  note: pending migrations require AFENDA_ALLOW_DB_MIGRATE=1 pnpm db:migrate",
	);
}

process.exit(0);
