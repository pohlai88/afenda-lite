/**
 * Cursor preToolUse guidance — route UI metadata contracts through the manifest.
 * Repository authority remains TypeScript, validateGovernance(), and source tests.
 */
import {
	WRITE_TOOLS,
	extractPathAndText,
	normalizePath,
	resolveResultText,
	respond,
} from "./hook-policy.mjs";
import { readHookPayload } from "./hook-stdin.mjs";

const CONTRACT_PATH =
	/(^|\/)packages\/surfaces\/ui-system\/src\/metadata\/contracts\/[^/]+\.contract\.ts$/i;
const MANIFEST_PATH =
	/(^|\/)packages\/surfaces\/ui-system\/src\/metadata\/contracts\/manifest\.contract\.ts$/i;
const MANIFEST_IMPORT =
	/import\s*\{[^}]*\bdefineManifestContract\b[^}]*\}\s*from\s*["']\.\/manifest\.contract["']/m;
const MANIFEST_CALL = /\bdefineManifestContract\s*\(/m;
const LOW_LEVEL_FACTORY =
	/import\s*\{[^}]*\bdefineComponentContract\b[^}]*\}|\bdefineComponentContract\s*\(/m;

function violation(text) {
	if (LOW_LEVEL_FACTORY.test(text)) {
		return "component contracts must not import or call defineComponentContract directly";
	}
	if (!MANIFEST_IMPORT.test(text)) {
		return 'missing defineManifestContract import from "./manifest.contract"';
	}
	if (!MANIFEST_CALL.test(text)) {
		return "missing defineManifestContract(...) authoring call";
	}
	return null;
}

try {
	const payload = await readHookPayload();
	const toolName = String(payload.tool_name || payload.toolName || "");
	const toolInput =
		payload.tool_input && typeof payload.tool_input === "object"
			? payload.tool_input
			: payload.toolInput && typeof payload.toolInput === "object"
				? payload.toolInput
				: {};

	if (!WRITE_TOOLS.has(toolName)) {
		respond({ permission: "allow" });
		process.exit(0);
	}

	const { filePath, text, oldString } = extractPathAndText(toolName, toolInput);
	const normalizedPath = normalizePath(filePath);
	if (!CONTRACT_PATH.test(normalizedPath) || MANIFEST_PATH.test(normalizedPath)) {
		respond({ permission: "allow" });
		process.exit(0);
	}

	const resultText = resolveResultText(toolName, filePath, text, oldString);
	const reason = violation(resultText);
	if (!reason) {
		respond({ permission: "allow" });
		process.exit(0);
	}

	respond({
		permission: "deny",
		user_message:
			"Blocked: UI metadata component contracts must be authored through manifest.contract.ts.",
		agent_message: `DENIED by ui-contract-manifest hook: ${reason}. Use defineManifestContract() and keep lifecycle, evidence, registration, and implementation parity in catalog.ts/validate.ts.`,
	});
	process.exit(0);
} catch (error) {
	respond({
		permission: "allow",
		agent_message: `ui-contract-manifest soft-fail (allow): ${String(error)}`,
	});
	process.exit(0);
}
