/**
 * Fail-closed guard for `pnpm --filter @afenda/db db:migrate`.
 *
 * 0000_living-roots-baseline.sql is a journal baseline for forward diffs.
 * Applying it on br-tiny-hill-ao82jp6f would try CREATE on existing tables.
 *
 * Set AFENDA_ALLOW_DB_MIGRATE=1 only for deliberate non-baseline forward migrates.
 * Authority: ARCH-025 · ARCH-028 S2.2
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

const result = spawnSync("pnpm", ["exec", "drizzle-kit", "migrate"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
