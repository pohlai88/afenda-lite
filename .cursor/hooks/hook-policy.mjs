/**
 * Shared helpers for Cursor preToolUse policy hooks.
 * Keep stdout JSON-only via respond(); never log to stdout.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const WRITE_TOOLS = new Set([
	"Write",
	"StrReplace",
	"EditNotebook",
	"TabWrite",
]);

/**
 * @param {Record<string, unknown>} payload
 */
export function respond(payload) {
	process.stdout.write(`${JSON.stringify(payload)}\n`);
}

/**
 * Paths where documenting bans (shim/MVP/decision wording) is allowed.
 * @param {string} filePath
 */
export function isBanSurfacePath(filePath) {
	if (!filePath) {
		return false;
	}
	const p = filePath.replace(/\\/g, "/").toLowerCase();

	if (p.includes("/.cursor/hooks/") || p.endsWith("/.cursor/hooks")) {
		return true;
	}
	if (p.includes("/.cursor/rules/") || p.endsWith("/.cursor/rules")) {
		return true;
	}
	if (p.endsWith("/agents.md") || /(^|\/)agents\.md$/.test(p)) {
		return true;
	}
	if (p.includes("/deprecation-and-migration/")) {
		return true;
	}
	return false;
}

/**
 * @param {string} toolName
 * @param {Record<string, unknown>} toolInput
 * @returns {{ filePath: string, text: string, oldString: string }}
 */
export function extractPathAndText(toolName, toolInput) {
	if (!toolInput || typeof toolInput !== "object") {
		return { filePath: "", text: "", oldString: "" };
	}

	if (toolName === "Write") {
		return {
			filePath: String(toolInput.path || toolInput.file_path || ""),
			text: String(toolInput.contents ?? toolInput.content ?? ""),
			oldString: "",
		};
	}

	if (toolName === "StrReplace") {
		return {
			filePath: String(toolInput.path || toolInput.file_path || ""),
			text: String(toolInput.new_string ?? toolInput.new_str ?? ""),
			oldString: String(toolInput.old_string ?? toolInput.old_str ?? ""),
		};
	}

	if (toolName === "EditNotebook") {
		return {
			filePath: String(toolInput.target_notebook || toolInput.path || ""),
			text: String(toolInput.new_string ?? ""),
			oldString: String(toolInput.old_string ?? ""),
		};
	}

	if (toolName === "TabWrite") {
		return {
			filePath: String(toolInput.path || toolInput.file_path || ""),
			text: String(
				toolInput.contents ?? toolInput.content ?? toolInput.new_string ?? "",
			),
			oldString: "",
		};
	}

	return { filePath: "", text: "", oldString: "" };
}

/**
 * @param {string} filePath
 * @returns {string | null}
 */
export function readExistingFile(filePath) {
	if (!filePath || !existsSync(filePath)) {
		return null;
	}
	try {
		return readFileSync(filePath, "utf8");
	} catch {
		return null;
	}
}

/**
 * Build the text that would exist after the edit for policy counting.
 * Write / TabWrite → payload text. StrReplace → apply one replacement on disk.
 * @param {string} toolName
 * @param {string} filePath
 * @param {string} text
 * @param {string} oldString
 */
export function resolveResultText(toolName, filePath, text, oldString) {
	if (toolName === "Write" || toolName === "TabWrite") {
		return text;
	}

	if (toolName === "StrReplace" || toolName === "EditNotebook") {
		const existing = readExistingFile(filePath);
		if (existing === null) {
			return text;
		}
		if (oldString && existing.includes(oldString)) {
			return existing.replace(oldString, text);
		}
		return existing;
	}

	return text;
}

/**
 * Normalize path separators for policy checks.
 * @param {string} filePath
 */
export function normalizePath(filePath) {
	return String(filePath || "").replace(/\\/g, "/");
}

/**
 * Basename helper re-export convenience.
 * @param {string} filePath
 */
export function fileBasename(filePath) {
	return path.basename(filePath || "");
}
