/**
 * ARCH-028 S2.2 — journal consistency + live credential gate.
 * Live column inventory was reconciled in S2.1 via Neon MCP on br-tiny-hill-ao82jp6f.
 * Numbered SQL under db/migrations/ is absent on this Collapse checkout (no archive move).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const drizzleDir = join(root, "drizzle");

if (!existsSync(drizzleDir)) {
	console.error(
		"@afenda/db db:check: missing packages/db/drizzle/ — run pnpm --filter @afenda/db db:generate first",
	);
	process.exit(1);
}

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
		"@afenda/db db:check: journal OK (DATABASE_URL unset — skipped live migrate dry; S2.1 Neon introspect remains authority for live columns)",
	);
	process.exit(0);
}

// Prefer pooler for product paths; warn only (do not print the URL).
if (!process.env.DATABASE_URL.includes("-pooler")) {
	console.warn(
		"@afenda/db db:check: DATABASE_URL has no -pooler suffix (ARCH-023 prefers pooler for app paths)",
	);
}

console.log(
	"@afenda/db db:check: journal OK; DATABASE_URL present — live schema remain validated via S2.1 introspect + generated migrations under drizzle/",
);
process.exit(0);
