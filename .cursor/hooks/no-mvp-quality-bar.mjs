/**
 * Cursor preToolUse hook — deny MVP quality / MVP proposal / MVP planning frames.
 * Sole allowed bar: enterprise production quality.
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
		re: /\bMVP\s+quality\b|\bMVP[- ]?grade\b|\bMVP[- ]?OK\b|\bgood\s+enough\s+for\s+MVP\b/gi,
		why: "MVP quality / MVP-OK carve-out",
	},
	{
		re: /\bMVP\s+(proposal|plan|planning|roadmap|scope|bar)\b/gi,
		why: "MVP proposal / planning / scope language",
	},
	{
		re: /\b(propose|propose\s+an?|draft|write)\s+.*\bMVP\b|\bMVP\s+(proposal|one[- ]pager)\b/gi,
		why: "MVP proposal framing",
	},
	{
		re: /\bminimum\s+viable\s+(product|scope|release|quality|bar)\b/gi,
		why: "minimum viable product/scope as quality bar",
	},
	{
		re: /\b(ship\s+as\s+MVP|MVP\s+first|MVP\s+then\s+harden|until\s+MVP|for\s+the\s+MVP)\b/gi,
		why: "MVP-first / defer-production language",
	},
	{
		re: /\b(later\s+for\s+production|production[- ]ready\s+later|harden\s+after\s+MVP)\b/gi,
		why: "defer enterprise production quality",
	},
	{
		re: /\bEnterprise\s+MVP\b/gi,
		why: "Enterprise MVP claim frame (use Module Enterprise Readiness + evidence)",
	},
	{
		re: /\bprogram\s+MVP\b|\bMVP\s+claimable\b|\bclaim\s+MVP\b/gi,
		why: "program MVP / claimable MVP planning frame",
	},
];

/**
 * New files / paths that encode MVP planning surfaces.
 * @param {string} filePath
 */
function isForbiddenFileName(filePath) {
	if (!filePath) {
		return false;
	}
	const base = path.basename(filePath).toLowerCase();
	const normalized = filePath.replace(/\\/g, "/").toLowerCase();
	return (
		/(^|[._-])mvp([._-]|$)/.test(base) ||
		base.includes(".mvp.") ||
		base.includes("-mvp.") ||
		base.includes("_mvp.") ||
		/minimum[-_]?viable/.test(base) ||
		/(^|\/)mvp(\/|$)/.test(normalized) ||
		/(^|\/)minimum[-_]?viable(\/|$)/.test(normalized)
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
				"Blocked: MVP / minimum-viable filenames and paths are not allowed. Use enterprise production scope naming only.",
			agent_message:
				"DENIED by no-mvp-quality-bar hook: forbidden MVP/minimum-viable path. Do not create MVP proposal/plan/quality surfaces. Plan and ship to the enterprise production quality bar, or stop and ask the user for an explicit written exception in this turn. Do not bypass by renaming.",
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
		user_message: `Blocked: ${next.why}. Sole bar is enterprise production quality.`,
		agent_message: `DENIED by no-mvp-quality-bar hook (${next.why}). MVP quality, MVP proposals, and MVP planning are NOT ALLOWED. Rewrite to the enterprise production quality bar (Approved slice / Module Enterprise Readiness + evidence). Do not split/encode the edit to bypass the hook.`,
	});
	process.exit(0);
} catch (err) {
	respond({
		permission: "allow",
		agent_message: `no-mvp-quality-bar soft-fail (allow): ${String(err)}`,
	});
	process.exit(0);
}
