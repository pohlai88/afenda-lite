/**
 * Cursor preToolUse hook — keep @afenda/corporate-administration scaffolded.
 *
 * Stdin: { tool_name, tool_input, ... }
 * @see https://cursor.com/docs/hooks
 */
import {
	WRITE_TOOLS,
	extractPathAndText,
	isBanSurfacePath,
	normalizePath,
	resolveResultText,
	respond,
} from "./hook-policy.mjs";
import { readHookPayload } from "./hook-stdin.mjs";

const MANIFEST_PATH =
	"packages/erp/corporate-administration/src/composition/module.manifest.ts";
const FORBIDDEN_LIFECYCLES = /\blifecycle:\s*["'](?:active|preview|beta|production)["']/i;
const REQUIRED_LIFECYCLE = /\blifecycle:\s*["']scaffolded["']/;
const REQUIRED_ACTIVATION_MODE =
	/\bactivationMode:\s*["']organization_toggle["']/;

/**
 * @param {string} filePath
 */
function isCorporateAdministrationManifest(filePath) {
	const normalized = normalizePath(filePath).toLowerCase();
	return normalized.endsWith(MANIFEST_PATH);
}

/**
 * @param {string} text
 */
function lifecycleViolation(text) {
	if (FORBIDDEN_LIFECYCLES.test(text)) {
		return "forbidden Corporate Administration lifecycle value";
	}
	if (!REQUIRED_LIFECYCLE.test(text)) {
		return 'missing required lifecycle: "scaffolded"';
	}
	if (!REQUIRED_ACTIVATION_MODE.test(text)) {
		return 'missing required activationMode: "organization_toggle"';
	}
	return null;
}

try {
	const payload = await readHookPayload();
	const toolName = String(payload.tool_name || payload.toolName || "");
	const toolInput =
		/** @type {Record<string, unknown>} */ (
			payload.tool_input || payload.toolInput || {}
		);

	if (!WRITE_TOOLS.has(toolName)) {
		respond({ permission: "allow" });
		process.exit(0);
	}

	const { filePath, text, oldString } = extractPathAndText(toolName, toolInput);
	if (isBanSurfacePath(filePath) || !isCorporateAdministrationManifest(filePath)) {
		respond({ permission: "allow" });
		process.exit(0);
	}

	const resultText = resolveResultText(toolName, filePath, text, oldString);
	const violation = lifecycleViolation(resultText);
	if (violation === null) {
		respond({ permission: "allow" });
		process.exit(0);
	}

	respond({
		permission: "deny",
		user_message:
			"Blocked: Corporate Administration must remain lifecycle scaffolded with organization_toggle activation mode.",
		agent_message: `DENIED by corporate-administration-lifecycle-position hook: ${violation}. Implemented capabilities do not satisfy enterprise activation requirements. Keep lifecycle: "scaffolded" and activationMode: "organization_toggle".`,
	});
	process.exit(0);
} catch (err) {
	respond({
		permission: "allow",
		agent_message: `corporate-administration-lifecycle-position soft-fail (allow): ${String(err)}`,
	});
	process.exit(0);
}
