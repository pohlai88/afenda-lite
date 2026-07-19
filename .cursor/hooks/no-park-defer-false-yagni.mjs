/**
 * Cursor preToolUse hook — deny parking, deferral-as-completion, and false YAGNI.
 * No current consumer ≠ authority to delete, rewrite, or refuse a surface.
 *
 * Cursor often flattens StrReplace into a full-file Write. Compare match counts
 * against the on-disk file so agents can remove historical residue without being
 * blocked by remaining matches elsewhere in the same file.
 *
 * Stdin: { tool_name, tool_input, ... }
 * @see https://cursor.com/docs/hooks
 */
import path from "node:path";

import {
	WRITE_TOOLS,
	extractPathAndText,
	isBanSurfacePath,
	readExistingFile,
	resolveResultText,
	respond,
} from "./hook-policy.mjs";
import { readHookPayload } from "./hook-stdin.mjs";

const FORBIDDEN_PATTERNS = [
	{
		re: /\bpark(ed|ing)?\s+(for\s+(later|now)|this\s+work|behind|here)\b/gi,
		why: "park work / park for later",
	},
	{
		re: /\b(park\s+for\s+now|parked\s+for\s+now|work\s+parked)\b/gi,
		why: "park for now / work parked",
	},
	{
		re: /\bdefer(red)?\s+(implementation|work|this|to\s+later|until\s+later|for\s+later)\b/gi,
		why: "defer implementation / defer for later",
	},
	{
		re: /\b(come\s+back\s+to\s+this\s+later|revisit\s+(this\s+)?later)\b/gi,
		why: "come back / revisit later parking",
	},
	{
		re: /\bYAGNI\b/gi,
		why: "YAGNI justification (false YAGNI)",
	},
	{
		re: /\bno\s+consumer(s)?\b[\s\S]{0,80}\b(remove|delete|drop|strip|refactor|rewrite|re-?cod(?:e|ing))\b/gi,
		why: "no consumer → remove/refactor",
	},
	{
		re: /\b(remove|delete|drop|strip|refactor|rewrite|re-?cod(?:e|ing))\b[\s\S]{0,80}\b(no\s+consumer|unused|YAGNI)\b/gi,
		why: "remove/refactor because unused / no consumer",
	},
	{
		re: /\b(because|since)\s+(there\s+(are|is)\s+)?no\s+(current\s+)?(consumer|importer|caller)s?\b/gi,
		why: "no-consumer / no-importer justification",
	},
	{
		re: /\bunused\s+so\s+(remove|delete|drop|strip)\b/gi,
		why: "unused so remove",
	},
	{
		re: /\b(won'?t\s+be\s+(used|needed)|will\s+not\s+(be\s+)?(used|needed))\s+(so|therefore)\b/gi,
		why: "invented won't-be-used justification",
	},
	{
		re: /\b(no\s+importers?\s+so|nothing\s+imports\s+(it|this)\s+so)\b/gi,
		why: "no importers → drop authority",
	},
];

/**
 * New files / paths that encode parking or deferred surfaces.
 * @param {string} filePath
 */
function isForbiddenFileName(filePath) {
	if (!filePath) {
		return false;
	}
	const base = path.basename(filePath).toLowerCase();
	const normalized = filePath.replace(/\\/g, "/").toLowerCase();
	return (
		/(^|[._-])(parked|deferred|yagni)([._-]|$)/.test(base) ||
		base.includes(".parked.") ||
		base.includes(".deferred.") ||
		base.includes("-parked.") ||
		base.includes("-deferred.") ||
		/(^|\/)parked(\/|$)/.test(normalized) ||
		/(^|\/)deferred(\/|$)/.test(normalized)
	);
}

/**
 * @param {string} text
 * @returns {{ count: number, why: string | null }}
 */
function analyzeForbidden(text) {
	if (!text || typeof text !== "string") {
		return { count: 0, why: null };
	}

	let count = 0;
	let why = null;

	for (const pattern of FORBIDDEN_PATTERNS) {
		const re = new RegExp(pattern.re.source, pattern.re.flags);
		const matches = text.match(re);
		if (matches?.length) {
			count += matches.length;
			if (!why) {
				why = pattern.why;
			}
		}
	}

	return { count, why };
}

try {
	const payload = await readHookPayload();
	const toolName = String(payload.tool_name || payload.toolName || "");
	const toolInput =
		/** @type {Record<string, unknown>} */ (
			payload.tool_input || payload.toolInput || payload.arguments || {}
		);

	if (!WRITE_TOOLS.has(toolName)) {
		respond({ permission: "allow" });
		process.exit(0);
	}

	const { filePath, text, oldString } = extractPathAndText(toolName, toolInput);

	if (isBanSurfacePath(filePath)) {
		respond({ permission: "allow" });
		process.exit(0);
	}

	if (isForbiddenFileName(filePath)) {
		respond({
			permission: "deny",
			user_message:
				"Blocked: parked / deferred / YAGNI filenames and paths are not allowed. Ship real work or get an explicit named drop this turn.",
			agent_message:
				"DENIED by no-park-defer-false-yagni hook: forbidden parked/deferred/yagni path. Do not create parking surfaces. Finish the real slice, or stop and ask the user for an explicit written exception or named drop in this turn. Do not bypass by renaming.",
		});
		process.exit(0);
	}

	const resultText = resolveResultText(toolName, filePath, text, oldString);
	const next = analyzeForbidden(resultText);
	if (next.count === 0) {
		respond({ permission: "allow" });
		process.exit(0);
	}

	const existing = readExistingFile(filePath);
	if (existing !== null) {
		const prev = analyzeForbidden(existing);
		if (next.count <= prev.count) {
			respond({ permission: "allow" });
			process.exit(0);
		}
	}

	respond({
		permission: "deny",
		user_message: `Blocked: ${next.why}. No parking, no defer, no false YAGNI — no consumer ≠ unused.`,
		agent_message: `DENIED by no-park-defer-false-yagni hook (${next.why}). Parking, deferral-as-completion, and false YAGNI deletes are NOT ALLOWED. Absence of a current consumer is not delete/refactor authority unless the user names the drop this turn. Finish the real work or stop and ask. Do not split/encode the edit to bypass the hook.`,
	});
	process.exit(0);
} catch (err) {
	respond({
		permission: "allow",
		agent_message: `no-park-defer-false-yagni soft-fail (allow): ${String(err)}`,
	});
	process.exit(0);
}
