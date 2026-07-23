/**
 * Cursor preToolUse hook — deny regressions in .vscode/settings.json editor posture.
 *
 * Stdin: { tool_name, tool_input, ... }
 */
import {
	FORBIDDEN_SETTING_KEYS,
	NODE_WRAPPER_LSP_BIN,
	REQUIRED_SCALAR_SETTINGS,
	WATCHER_EXCLUDE_PATTERNS,
} from "../../scripts/lib/editor-posture.mjs";
import {
	WRITE_TOOLS,
	extractPathAndText,
	isBanSurfacePath,
	readExistingFile,
	resolveResultText,
	respond,
} from "./hook-policy.mjs";
import { readHookPayload } from "./hook-stdin.mjs";

function isSettingsPath(filePath) {
	if (!filePath) {
		return false;
	}
	const normalized = filePath.replace(/\\/g, "/").toLowerCase();
	return (
		normalized.endsWith("/.vscode/settings.json") ||
		normalized.endsWith(".vscode/settings.json")
	);
}

/**
 * @param {string} text
 */
function findDrift(text) {
	/** @type {string[]} */
	const reasons = [];

	for (const key of FORBIDDEN_SETTING_KEYS) {
		const escaped = key.replace(/\./g, "\\.");
		if (new RegExp(`"${escaped}"\\s*:`).test(text)) {
			reasons.push(`${key} is deprecated — remove from settings`);
		}
	}

	for (const [key, expected] of Object.entries(REQUIRED_SCALAR_SETTINGS)) {
		const escaped = key.replace(/\./g, "\\.");
		if (typeof expected === "boolean") {
			const want = expected ? "true" : "false";
			if (new RegExp(`"${escaped}"\\s*:\\s*${want === "true" ? "false" : "true"}`).test(text)) {
				reasons.push(`${key} must be ${want}`);
			}
			if (!new RegExp(`"${escaped}"\\s*:`).test(text)) {
				reasons.push(`${key} is required`);
			}
		} else if (typeof expected === "number") {
			if (!new RegExp(`"${escaped}"\\s*:\\s*${expected}`).test(text)) {
				reasons.push(`${key} must be ${expected}`);
			}
		} else if (typeof expected === "string") {
			const quoted = expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			if (!new RegExp(`"${escaped}"\\s*:\\s*"${quoted}"`).test(text)) {
				reasons.push(`${key} must be "${expected}"`);
			}
		}
	}

	if (!/"biome\.lsp\.bin"\s*:/.test(text)) {
		reasons.push("biome.lsp.bin platform map is required");
	}
	if (text.includes(NODE_WRAPPER_LSP_BIN)) {
		reasons.push(
			"biome.lsp.bin must not use @biomejs/biome/bin/biome node wrapper",
		);
	}

	for (const pattern of WATCHER_EXCLUDE_PATTERNS) {
		const quoted = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		if (!new RegExp(`"${quoted}"\\s*:\\s*true`).test(text)) {
			reasons.push(`files.watcherExclude must include "${pattern}": true`);
		}
	}

	if (!/"typescript\.tsserver\.watchOptions"\s*:/.test(text)) {
		reasons.push("typescript.tsserver.watchOptions is required");
	}
	if (!/"typescript\.disableAutomaticTypeAcquisition"\s*:\s*true/.test(text)) {
		reasons.push("typescript.disableAutomaticTypeAcquisition must be true");
	}
	if (!/"tailwindCSS\.files\.exclude"\s*:/.test(text)) {
		reasons.push("tailwindCSS.files.exclude is required");
	}

	const biomeLangs = [
		"typescript",
		"typescriptreact",
		"javascript",
		"javascriptreact",
	];
	for (const lang of biomeLangs) {
		const blockRe = new RegExp(
			`\\["${lang}"\\][\\s\\S]*?"editor\\.defaultFormatter"\\s*:\\s*"([^"]+)"`,
		);
		const match = text.match(blockRe);
		if (match && match[1] !== "biomejs.biome") {
			reasons.push(
				`[${lang}].editor.defaultFormatter must be "biomejs.biome" (found "${match[1]}")`,
			);
		}
	}

	return reasons;
}

try {
	const payload = await readHookPayload();
	const toolName = String(payload.tool_name ?? payload.toolName ?? "");
	const toolInput =
		payload.tool_input && typeof payload.tool_input === "object"
			? /** @type {Record<string, unknown>} */ (payload.tool_input)
			: payload.toolInput && typeof payload.toolInput === "object"
				? /** @type {Record<string, unknown>} */ (payload.toolInput)
				: {};

	if (!WRITE_TOOLS.has(toolName)) {
		respond({ permission: "allow" });
		process.exit(0);
	}

	const { filePath, text, oldString } = extractPathAndText(toolName, toolInput);
	if (isBanSurfacePath(filePath) || !isSettingsPath(filePath)) {
		respond({ permission: "allow" });
		process.exit(0);
	}

	const resultText = resolveResultText(toolName, filePath, text, oldString);
	const existing = readExistingFile(filePath);
	const merged =
		toolName === "StrReplace" && existing && oldString && existing.includes(oldString)
			? existing.replace(oldString, text)
			: resultText;

	const reasons = findDrift(merged);
	if (reasons.length > 0) {
		respond({
			permission: "deny",
			user_message: `Blocked .vscode/settings.json drift: ${reasons.slice(0, 5).join("; ")}${reasons.length > 5 ? ` (+${reasons.length - 5} more)` : ""}. Run pnpm check:editor-biome.`,
		});
		process.exit(0);
	}

	respond({ permission: "allow" });
	process.exit(0);
} catch (err) {
	respond({
		permission: "allow",
		agent_message: `no-editor-biome-drift soft-fail (allow): ${String(err)}`,
	});
	process.exit(0);
}
