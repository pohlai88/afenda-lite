/**
 * Fail-closed guard for `pnpm --filter @afenda/db db:migrate` (N2).
 *
 * 0000_living-roots-baseline.sql is a journal baseline for forward diffs.
 * Applying it on br-tiny-hill-ao82jp6f would try CREATE on existing tables.
 *
 * Requires:
 * - AFENDA_ALLOW_DB_MIGRATE=1
 * - non-sole-0000 SQL set
 * - valid migration-class DATABASE_URL (same key; -pooler not required)
 * - additive-first SQL unless AFENDA_ALLOW_DESTRUCTIVE_MIGRATE=1
 *
 * Authority: ARCH-025 · ARCH-028 S2.2 · N2
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assertAdditiveMigrations } from "./lib/assert-additive-migration.mjs";
import { requireMigrationDatabaseUrl } from "./lib/database-url.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const drizzleDir = join(root, "drizzle");

const allow = process.env.AFENDA_ALLOW_DB_MIGRATE === "1";

if (!allow) {
	console.error(`
@afenda/db db:migrate DENIED

0000_living-roots-baseline.sql is a journal baseline for forward diffs.
Applying it with db:migrate on br-tiny-hill-ao82jp6f would try CREATE on existing tables — do not.

Allowed without override: db:generate · db:check
Override (operator only): AFENDA_ALLOW_DB_MIGRATE=1 pnpm --filter @afenda/db db:migrate

See ARCH-028 S2.2 · ARCH-025 Operational considerations · .cursor/hooks/no-drizzle-baseline-migrate.mjs
`);
	process.exit(1);
}

if (!existsSync(drizzleDir)) {
	console.error("@afenda/db db:migrate: missing packages/db/drizzle/");
	process.exit(1);
}

const sqlFiles = readdirSync(drizzleDir).filter((f) => f.endsWith(".sql"));
const onlyBaseline =
	sqlFiles.length === 1 && sqlFiles[0] === "0000_living-roots-baseline.sql";

if (onlyBaseline) {
	console.error(`
@afenda/db db:migrate DENIED even with AFENDA_ALLOW_DB_MIGRATE=1

The only migration is 0000_living-roots-baseline.sql (CREATE baseline for tables that already exist on live Neon).
Generate a forward migration after a schema change, then migrate that file — never apply 0000 alone.
`);
	process.exit(1);
}

try {
	requireMigrationDatabaseUrl(process.env);
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`@afenda/db db:migrate DENIED: ${message}`);
	process.exit(1);
}

const allowDestructive = process.env.AFENDA_ALLOW_DESTRUCTIVE_MIGRATE === "1";
const sqlContents = sqlFiles.map((file) =>
	readFileSync(join(drizzleDir, file), "utf8"),
);
const additive = assertAdditiveMigrations(sqlContents, { allowDestructive });
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

const result = spawnSync("pnpm", ["exec", "drizzle-kit", "migrate"], {
	cwd: root,
	stdio: "inherit",
	shell: true,
	env: process.env,
});

process.exit(result.status ?? 1);
