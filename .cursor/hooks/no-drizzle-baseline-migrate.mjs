/**
 * Cursor beforeShellExecution hook — ban accidental Drizzle migrate of the
 * living-roots baseline against Neon (CREATE on existing tables).
 *
 * Blocks: drizzle-kit migrate · pnpm … db:migrate · filter @afenda/db db:migrate
 * Escape: AFENDA_ALLOW_DB_MIGRATE=1 (explicit operator override only)
 *
 * Fail-closed on parse / runtime errors (N2).
 *
 * Stdin: { command, cwd, ... }
 * @see https://cursor.com/docs/hooks
 * Authority: ARCH-025 · ARCH-028 S2.2 · N2
 */
import { respond } from "./hook-policy.mjs";
import { readHookPayloadStrict } from "./hook-stdin.mjs";

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

	if (/\bdb:migrate\b/i.test(c)) {
		return true;
	}

	if (/\bdb-migrate-guard\.mjs\b/i.test(c) && !/\b--help\b/i.test(c)) {
		return true;
	}

	return false;
}

try {
	const payload = await readHookPayloadStrict();
	const command = typeof payload.command === "string" ? payload.command : "";

	const allowEnv =
		process.env.AFENDA_ALLOW_DB_MIGRATE === "1" ||
		/\bAFENDA_ALLOW_DB_MIGRATE\s*=\s*1\b/.test(normalize(command));

	if (isDbMigrateCommand(command) && !allowEnv) {
		respond({
			permission: "deny",
			user_message:
				"Blocked: Drizzle db:migrate is banned while 0000_living-roots-baseline.sql is the journal baseline. Applying it on br-tiny-hill-ao82jp6f would CREATE tables that already exist. Use db:generate / db:check only. Override only with AFENDA_ALLOW_DB_MIGRATE=1 for a deliberate non-baseline migrate.",
			agent_message:
				"DENIED: db:migrate / drizzle-kit migrate is banned (ARCH-028 S2.2 / ARCH-025 / N2). 0000_living-roots-baseline.sql is a forward-diff journal baseline — do not apply CREATE onto live Neon. Do not bypass the hook. Tell the user; only proceed if they set AFENDA_ALLOW_DB_MIGRATE=1 for a later forward migration.",
		});
		process.exit(0);
	}

	respond({ permission: "allow" });
	process.exit(0);
} catch (err) {
	respond({
		permission: "deny",
		user_message:
			"Blocked: no-drizzle-baseline-migrate hook failed closed (parse or runtime error).",
		agent_message: `DENIED: no-drizzle-baseline-migrate fail-closed: ${String(err)}`,
	});
	process.exit(0);
}
