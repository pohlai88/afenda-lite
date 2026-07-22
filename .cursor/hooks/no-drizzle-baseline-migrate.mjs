/**
 * Cursor beforeShellExecution + beforeMCPExecution — Drizzle schema funnel (N2).
 *
 * Canonical path: db:generate → db:check → AFENDA_ALLOW_DB_MIGRATE=1 db:migrate
 * (via db-migrate-guard.mjs). Blocks push, ad-hoc SQL apply, raw drizzle-kit
 * migrate/push, and Neon MCP DDL / migration ledger writes.
 *
 * Escape migrate: AFENDA_ALLOW_DB_MIGRATE=1 (operator only)
 *
 * Fail-closed on parse / runtime errors (N2).
 *
 * Stdin: shell { command, ... } · MCP { tool_name, server, arguments, ... }
 * Authority: ARCH-025 · ARCH-028 S2.2 · N2
 */
import { respond } from "./hook-policy.mjs";
import { readHookPayloadStrict } from "./hook-stdin.mjs";

const DENY_SHELL = {
	permission: "deny",
	user_message:
		"Blocked: database schema changes must use db:generate → db:check → AFENDA_ALLOW_DB_MIGRATE=1 pnpm db:migrate. Push, ad-hoc SQL apply, and raw drizzle-kit migrate/push are banned.",
	agent_message:
		"DENIED: non-Drizzle schema path. Use db:generate | db:check | AFENDA_ALLOW_DB_MIGRATE=1 pnpm --filter @afenda/db db:migrate. Read-only: db:migration-status. Do not bypass via MCP DDL or apply-*.mjs scripts.",
};

const DENY_MIGRATE_WITHOUT_OVERRIDE = {
	permission: "deny",
	user_message:
		"Blocked: Drizzle db:migrate is banned without AFENDA_ALLOW_DB_MIGRATE=1. A sole 0000_*.sql baseline CREATE on br-tiny-hill-ao82jp6f when tables already exist will fail. Use db:generate / db:check only. For forward migrate set AFENDA_ALLOW_DB_MIGRATE=1; after an intentional empty-DB wipe also set AFENDA_ALLOW_BASELINE_MIGRATE=1.",
	agent_message:
		"DENIED: db:migrate / drizzle-kit migrate is banned (ARCH-028 S2.2 / ARCH-025 / N2). Do not bypass the hook. Only proceed with AFENDA_ALLOW_DB_MIGRATE=1 (and AFENDA_ALLOW_BASELINE_MIGRATE=1 for sole-0000 apply after wipe).",
};

const DENY_MCP = {
	permission: "deny",
	user_message:
		"Blocked: Neon MCP DDL / migration apply is banned. Use db:generate → db:check → AFENDA_ALLOW_DB_MIGRATE=1 pnpm db:migrate.",
	agent_message:
		"DENIED: Neon MCP schema mutation blocked. Use guarded db:migrate instead of prepare_database_migration / DDL run_sql.",
};

const DRIZZLE_SQL_PATH =
	/packages[/\\]data-plane[/\\]db[/\\]drizzle[/\\][\w.-]+\.sql/i;

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
function hasMigrateOverride(command) {
	return (
		process.env.AFENDA_ALLOW_DB_MIGRATE === "1" ||
		/\bAFENDA_ALLOW_DB_MIGRATE\s*=\s*1\b/.test(normalize(command))
	);
}

/**
 * @param {string} command
 */
function isAllowedShellCommand(command) {
	const c = normalize(command);
	if (!c) {
		return false;
	}

	if (/\bdb:generate\b/i.test(c)) {
		return true;
	}
	if (/\bdb:check\b/i.test(c)) {
		return true;
	}
	if (/\bdb:verify-migrate-ban\b/i.test(c)) {
		return true;
	}
	if (/\bdb:migration-status\b/i.test(c)) {
		return true;
	}
	if (/\bdb:introspect\b/i.test(c)) {
		return true;
	}
	if (/\bdb:ensure-permission-catalog\b/i.test(c)) {
		return true;
	}

	if (hasMigrateOverride(c)) {
		if (/\bdb:migrate\b/i.test(c)) {
			return true;
		}
		if (/\bdb-migrate-guard\.mjs\b/i.test(c) && !/\b--help\b/i.test(c)) {
			return true;
		}
	}

	if (
		/packages[/\\]data-plane[/\\]db[/\\]scripts[/\\]db-migration-status\.mjs/.test(
			c,
		)
	) {
		return true;
	}

	return false;
}

/**
 * @param {string} command
 */
function isBlockedShellMigration(command) {
	const c = normalize(command);
	if (!c) {
		return false;
	}

	if (isAllowedShellCommand(c)) {
		return false;
	}

	if (/\bdrizzle-kit\b[\s\S]*\bpush\b/i.test(c)) {
		return true;
	}
	if (/\bdb:push\b/i.test(c)) {
		return true;
	}
	if (/\bdb:pull\b/i.test(c)) {
		return true;
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

	if (
		/\bnode\b[\s\S]*packages[/\\]data-plane[/\\]db[/\\]scripts[/\\]apply-[\w-]+\.mjs/.test(
			c,
		)
	) {
		return true;
	}

	if (/\bpsql\b[\s\S]*packages[/\\]data-plane[/\\]db[/\\]drizzle[/\\]/.test(c)) {
		return true;
	}

	if (/\bnode\b[\s\S]*packages[/\\]data-plane[/\\]db[/\\]drizzle[/\\]/.test(c)) {
		return true;
	}

	if (DRIZZLE_SQL_PATH.test(c) && /\b(psql|node|cat)\b/i.test(c)) {
		return true;
	}

	return false;
}

/**
 * @param {Record<string, unknown>} input
 */
function isBlockedMcpMigration(input) {
	const toolName = String(
		input.tool_name ?? input.toolName ?? input.name ?? input.mcp_tool ?? "",
	).toLowerCase();

	if (!toolName) {
		return false;
	}

	if (toolName === "prepare_database_migration") {
		return true;
	}
	if (toolName === "complete_database_migration") {
		return true;
	}

	if (toolName === "apply_migration") {
		return true;
	}

	if (toolName === "run_sql" || toolName === "run_sql_transaction") {
		const args = /** @type {Record<string, unknown>} */ (
			input.arguments ?? input.args ?? {}
		);
		const query = String(args.query ?? args.sql ?? "").toLowerCase();
		if (!query) {
			return false;
		}

		const migrationLedger =
			/__drizzle_migrations|drizzle\.__drizzle_migrations/.test(query);
		const ddl =
			/\b(create|alter|drop|truncate)\b[\s\S]*\b(table|schema|function|index|policy|trigger|type|view)\b/.test(
				query,
			);

		if (migrationLedger || ddl) {
			return true;
		}
	}

	return false;
}

try {
	const payload = await readHookPayloadStrict();
	const command = typeof payload.command === "string" ? payload.command : "";
	const toolName = String(
		payload.tool_name ?? payload.toolName ?? payload.name ?? "",
	);

	if (toolName && isBlockedMcpMigration(payload)) {
		respond(DENY_MCP);
		process.exit(0);
	}

	if (command && isBlockedShellMigration(command)) {
		const c = normalize(command);
		const isMigrateOnly =
			(/\bdb:migrate\b/i.test(c) ||
				/\bdb-migrate-guard\.mjs\b/i.test(c) ||
				/\bdrizzle-kit\b[\s\S]*\bmigrate\b/i.test(c)) &&
			!/\bpush\b/i.test(c);

		if (isMigrateOnly && !hasMigrateOverride(c)) {
			respond(DENY_MIGRATE_WITHOUT_OVERRIDE);
		} else {
			respond(DENY_SHELL);
		}
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
