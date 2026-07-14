/**
 * Cursor beforeShellExecution hook — ban accidental Drizzle migrate of the
 * living-roots baseline against Neon (CREATE on existing tables).
 *
 * Blocks: drizzle-kit migrate · pnpm … db:migrate · filter @afenda/db db:migrate
 * Escape: AFENDA_ALLOW_DB_MIGRATE=1 (explicit operator override only)
 *
 * Stdin: { command, cwd, ... }
 * @see https://cursor.com/docs/hooks
 * Authority: ARCH-025 · ARCH-028 S2.2 operational ban
 */
import { readFileSync } from "node:fs";

function readPayload() {
  try {
    const raw = readFileSync(0, "utf8").trim();
    if (!raw) {
      return {};
    }
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function respond(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

/**
 * @param {string} command
 */
function normalize(command) {
  return command
    .replace(/\r\n/g, "\n")
    .replace(/\\\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} command
 */
function isDbMigrateCommand(command) {
  const c = normalize(command);
  if (!c) {
    return false;
  }

  if (/\bdrizzle-kit\b[\s\S]*\bmigrate\b/i.test(c)) {
    return true;
  }

  // pnpm/npm/yarn … db:migrate (including --filter @afenda/db)
  if (/\bdb:migrate\b/i.test(c)) {
    return true;
  }

  // Direct guard script bypass attempts
  if (/\bdb-migrate-guard\.mjs\b/i.test(c) && !/\b--help\b/i.test(c)) {
    return true;
  }

  return false;
}

const payload = readPayload();
const command = typeof payload.command === "string" ? payload.command : "";

// Inherit shell env (PowerShell $env:…) or inline AFENDA_ALLOW_DB_MIGRATE=1 in the command.
const allowEnv =
  process.env.AFENDA_ALLOW_DB_MIGRATE === "1" ||
  /\bAFENDA_ALLOW_DB_MIGRATE\s*=\s*1\b/.test(normalize(command));

if (isDbMigrateCommand(command) && !allowEnv) {
  respond({
    permission: "deny",
    user_message:
      "Blocked: Drizzle db:migrate is banned while 0000_living-roots-baseline.sql is the journal baseline. Applying it on br-tiny-hill-ao82jp6f would CREATE tables that already exist. Use db:generate / db:check only. Override only with AFENDA_ALLOW_DB_MIGRATE=1 for a deliberate non-baseline migrate.",
    agent_message:
      "DENIED: db:migrate / drizzle-kit migrate is banned (ARCH-028 S2.2 / ARCH-025). 0000_living-roots-baseline.sql is a forward-diff journal baseline — do not apply CREATE onto live Neon. Do not bypass the hook. Tell the user; only proceed if they set AFENDA_ALLOW_DB_MIGRATE=1 for a later forward migration.",
  });
  process.exit(0);
}

// When override is present, still pass through — packages/db/scripts/db-migrate-guard.mjs
// refuses to apply when the only SQL file is 0000_living-roots-baseline.sql.


respond({ permission: "allow" });
process.exit(0);
