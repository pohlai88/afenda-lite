/**
 * Cursor preToolUse + beforeShellExecution hook —
 * keep scripts with their owning directory; forbid dumping into root scripts/.
 *
 * Architecture:
 *   - Root `scripts/` = monorepo-wide gates/ops only (check-*, audit-*, validate-*, lib/, __tests__/)
 *   - Domain scripts stay co-located (e.g. governance/scripts/)
 *   - docs/template/** = markdown-only kits — no executable scripts
 *   - No agent temp dumps (_tmp*, _write*, _fix*, _staging*) under root scripts/
 *
 * Stdin: { tool_name, tool_input, ... } or shell payload { command }
 * @see https://cursor.com/docs/hooks
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
	WRITE_TOOLS,
	extractPathAndText,
	isBanSurfacePath,
	respond,
} from "./hook-policy.mjs";
import { readHookPayload } from "./hook-stdin.mjs";
import {
	scriptPlacementViolation,
	shellScriptDumpViolation,
} from "./directory-local-scripts-lib.mjs";

export { scriptPlacementViolation, shellScriptDumpViolation };

async function main() {
	const payload = await readHookPayload();
	const toolName = String(payload.tool_name || payload.toolName || "");
	const toolInput =
		/** @type {Record<string, unknown>} */ (
			payload.tool_input || payload.toolInput || {}
		);
	const command = String(payload.command || toolInput.command || "");

	if (toolName === "Shell" || command.length > 0) {
		const shellHit = shellScriptDumpViolation(command);
		if (shellHit !== null) {
			respond({
				permission: "deny",
				user_message:
					"Blocked: scripts must stay with their owning directory — do not dump into root scripts/ or docs/template/.",
				agent_message: `DENIED by directory-local-scripts hook: ${shellHit}. Root scripts/ is monorepo gates only; governance checks live under governance/scripts/; docs/template/ is markdown-only.`,
			});
			return;
		}
		if (!WRITE_TOOLS.has(toolName)) {
			respond({ permission: "allow" });
			return;
		}
	}

	if (!WRITE_TOOLS.has(toolName)) {
		respond({ permission: "allow" });
		return;
	}

	const { filePath } = extractPathAndText(toolName, toolInput);
	if (isBanSurfacePath(filePath)) {
		respond({ permission: "allow" });
		return;
	}

	const violation = scriptPlacementViolation(filePath);
	if (violation === null) {
		respond({ permission: "allow" });
		return;
	}

	respond({
		permission: "deny",
		user_message:
			"Blocked: scripts must stay with their owning directory — do not dump into root scripts/.",
		agent_message: `DENIED by directory-local-scripts hook: ${violation}.`,
	});
}

const invokedDirectly =
	process.argv[1] !== undefined &&
	pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (invokedDirectly) {
	try {
		await main();
	} catch (err) {
		respond({
			permission: "allow",
			agent_message: `directory-local-scripts soft-fail (allow): ${String(err)}`,
		});
	}
}
