/**
 * Fail-closed guard for `pnpm --filter @afenda/db db:migrate` (N2).
 *
 * A sole `0000_*.sql` journal baseline is CREATE DDL for an empty public schema.
 * Applying it on br-tiny-hill-ao82jp6f when tables already exist will fail CREATE.
 *
 * Requires:
 * - AFENDA_ALLOW_DB_MIGRATE=1
 * - non-sole-0000 SQL set, OR AFENDA_ALLOW_BASELINE_MIGRATE=1 (Mode C / empty-DB apply)
 * - direct migration DATABASE_URL (same key; Neon -pooler prohibited)
 * - additive-first SQL unless AFENDA_ALLOW_DESTRUCTIVE_MIGRATE=1
 *
 * Authority: ARCH-025 · ARCH-028 S2.2 · N2 · Mode C PL-S9 exception
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assertAdditiveMigrations } from "./lib/assert-additive-migration.mjs";
import { requireDirectMigrationDatabaseUrl } from "./lib/database-url.mjs";
import { applyIdentityMigrations } from "./lib/identity-migrator.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// packages/data-plane/db → repo root (three levels up)
const repoRoot = join(root, "../../..");
const drizzleDir = join(root, "drizzle");
const LINE_BREAK_PATTERN = /\r?\n/;
const ENV_ASSIGNMENT_PATTERN = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/;

/** Same load path as ensure-platform-permission-catalog — never print values. */
function loadEnvLocal() {
	if (process.env.DATABASE_URL) {
		return;
	}
	const envPath = join(repoRoot, ".env.local");
	if (!existsSync(envPath)) {
		return;
	}
	const text = readFileSync(envPath, "utf8");
	for (const line of text.split(LINE_BREAK_PATTERN)) {
		const trimmed = line.trim();
		if (trimmed.length === 0 || trimmed.startsWith("#")) {
			continue;
		}
		const match = ENV_ASSIGNMENT_PATTERN.exec(trimmed);
		if (!match) {
			continue;
		}
		const [, key, rawValue] = match;
		let value = rawValue?.trim() ?? "";
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

const allow = process.env.AFENDA_ALLOW_DB_MIGRATE === "1";

if (!allow) {
	console.error(`
@afenda/db db:migrate DENIED

A sole 0000_*.sql journal baseline is CREATE DDL — do not apply onto live Neon
when product tables already exist.

Allowed without override: db:generate · db:check
Override (operator only): AFENDA_ALLOW_DB_MIGRATE=1 pnpm --filter @afenda/db db:migrate
Sole baseline after intentional wipe: also set AFENDA_ALLOW_BASELINE_MIGRATE=1

See ARCH-028 S2.2 · ARCH-025 Operational considerations · .cursor/hooks/no-drizzle-baseline-migrate.mjs
`);
	process.exit(1);
}

if (!existsSync(drizzleDir)) {
	console.error(
		"@afenda/db db:migrate: missing packages/data-plane/db/drizzle/",
	);
	process.exit(1);
}

const sqlFiles = readdirSync(drizzleDir).filter((f) => f.endsWith(".sql"));
const onlyBaseline =
	sqlFiles.length === 1 && /^0000_.+\.sql$/.test(sqlFiles[0] ?? "");
const allowBaseline = process.env.AFENDA_ALLOW_BASELINE_MIGRATE === "1";

if (onlyBaseline && !allowBaseline) {
	console.error(`
@afenda/db db:migrate DENIED even with AFENDA_ALLOW_DB_MIGRATE=1

The only migration is ${sqlFiles[0]} (CREATE baseline).
Generate a forward migration after a schema change, then migrate that file —
or after an intentional empty-DB wipe set AFENDA_ALLOW_BASELINE_MIGRATE=1.
`);
	process.exit(1);
}

let databaseUrl;
try {
	databaseUrl = requireDirectMigrationDatabaseUrl(process.env);
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`@afenda/db db:migrate DENIED: ${message}`);
	process.exit(1);
}

const allowDestructive = process.env.AFENDA_ALLOW_DESTRUCTIVE_MIGRATE === "1";
const migrations = sqlFiles.map((file) => ({
	filename: file,
	sql: readFileSync(join(drizzleDir, file), "utf8"),
}));
const additive = assertAdditiveMigrations(migrations, { allowDestructive });
if (!additive.ok) {
	console.error(`
@afenda/db db:migrate DENIED — destructive SQL detected (additive-first policy)

Findings:
${additive.findings.map((f) => `  - ${f.reason}: ${f.statement}`).join("\n")}

Override only with explicit operator approval:
  AFENDA_ALLOW_DESTRUCTIVE_MIGRATE=1 AFENDA_ALLOW_DB_MIGRATE=1 pnpm --filter @afenda/db db:migrate
`);
	process.exit(1);
}
for (const exception of additive.approvedHistoricalExceptions) {
	console.log(
		`@afenda/db db:migrate: recognized immutable ${exception.status} ${exception.filename} (${exception.appliedHash}); this is not a general destructive-migration override`,
	);
}

try {
	await applyIdentityMigrations({ databaseUrl, drizzleDir });
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`@afenda/db db:migrate FAILED: ${message}`);
	process.exit(1);
}
