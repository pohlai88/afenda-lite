/**
 * N2 — journal consistency + drizzle-kit check + migration journal assert.
 * Live column inventory was reconciled in S2.1 via Neon MCP on br-tiny-hill-ao82jp6f.
 * Does not apply migrations.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assertMigrationJournal } from "./lib/assert-migration-journal.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const drizzleDir = join(root, "drizzle");

if (!existsSync(drizzleDir)) {
	console.error(
		"@afenda/db db:check: missing packages/data-plane/db/drizzle/ — run pnpm --filter @afenda/db db:generate first",
	);
	process.exit(1);
}

const journal = assertMigrationJournal(drizzleDir);
if (!journal.ok) {
	console.error("@afenda/db db:check: journal assert FAILED:");
	for (const issue of journal.issues) {
		console.error(`  - ${issue}`);
	}
	process.exit(1);
}
console.log("@afenda/db db:check: journal assert OK");

const check = spawnSync("pnpm", ["exec", "drizzle-kit", "check"], {
	cwd: root,
	stdio: "inherit",
	shell: true,
});

if (check.status !== 0) {
	process.exit(check.status ?? 1);
}

if (!process.env.DATABASE_URL) {
	console.log(
		"@afenda/db db:check: journal OK (DATABASE_URL unset — skipped live credential note; S2.1 Neon introspect remains authority for live columns)",
	);
	process.exit(0);
}

// Product paths require -pooler; migrate/ops may use non-pooler via the same key.
if (!process.env.DATABASE_URL.includes("-pooler")) {
	console.log(
		"@afenda/db db:check: DATABASE_URL present without -pooler (allowed for migration/ops class; product runtime still requires -pooler)",
	);
}

console.log(
	"@afenda/db db:check: OK — journal assert + drizzle-kit check; live schema remain validated via S2.1 introspect + generated migrations under drizzle/",
);
process.exit(0);
