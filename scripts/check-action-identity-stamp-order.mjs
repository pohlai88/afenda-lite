/**
 * pnpm check:action-identity-stamp-order
 *
 * Server Action identity must be stamped AFTER `...parsed.data` so client-parsed
 * fields cannot override organizationId / actorUserId / correlationId /
 * idempotencyKey (APP-SCAFFOLDING ingress identity + coding-discipline).
 *
 * Zod schemas that omit those fields make many sites unreachable today; this
 * gate enforces defense-in-depth so a future schema widen cannot reopen the hole.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_ROOT = process.cwd();
const ACTIONS_GLOB = "apps/web/app/actions";
const PATTERN =
	"organizationId:\\s*session\\.orgId,[\\s\\S]{0,250}\\.\\.\\.parsed\\.data";

/**
 * @param {string} root
 * @returns {{ ok: true } | { ok: false, files: string[] }}
 */
export function checkActionIdentityStampOrder(root = DEFAULT_ROOT) {
	const actionsDir = path.join(root, ACTIONS_GLOB);
	if (!existsSync(actionsDir)) {
		return { ok: true };
	}

	let stdout = "";
	try {
		stdout = execFileSync(
			"rg",
			[
				"-U",
				"--multiline",
				"-l",
				PATTERN,
				ACTIONS_GLOB,
				"--glob",
				"*.ts",
			],
			{
				cwd: root,
				encoding: "utf8",
			},
		);
	} catch (error) {
		const status = error && typeof error === "object" ? error.status : undefined;
		if (status === 1) {
			return { ok: true };
		}
		throw error;
	}

	const files = stdout
		.trim()
		.split(/\r?\n/)
		.filter(Boolean)
		.map((file) => file.replace(/\\/g, "/"));
	if (files.length === 0) {
		return { ok: true };
	}
	return { ok: false, files };
}

function main() {
	const result = checkActionIdentityStampOrder(DEFAULT_ROOT);
	if (result.ok) {
		console.log("check-action-identity-stamp-order: ok");
		process.exit(0);
	}
	console.error(
		"check-action-identity-stamp-order: stamp organizationId BEFORE ...parsed.data (client can override session identity):",
	);
	for (const file of result.files) {
		console.error(`  - ${file}`);
	}
	console.error(
		"Required order: { ...parsed.data, organizationId: session.orgId, actorUserId: session.userId, ... }",
	);
	process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
	main();
}
