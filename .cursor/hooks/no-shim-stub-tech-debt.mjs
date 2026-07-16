/**
 * Cursor preToolUse hook — deny shims, stubs, and tech-debt carve-outs in edits.
 *
 * Stdin: { tool_name, tool_input, ... }
 * @see https://cursor.com/docs/hooks
 */
import {
	WRITE_TOOLS,
	extractPathAndText,
	fileBasename,
	isBanSurfacePath,
	normalizePath,
	readExistingFile,
	resolveResultText,
	respond,
} from "./hook-policy.mjs";
import { readHookPayload } from "./hook-stdin.mjs";

/** Paths where test doubles are allowed (beyond ban-surface docs). */
function isTestDoublePath(filePath) {
	if (!filePath) {
		return false;
	}
	const p = normalizePath(filePath).toLowerCase();
	return (
		/\.(test|spec|interaction\.test)\.[cm]?[jt]sx?$/.test(p) ||
		p.includes("/__mocks__/") ||
		p.includes("/testing/") ||
		p.includes("/e2e/")
	);
}

/**
 * Suspicious filename for new shim/stub surfaces.
 * @param {string} filePath
 */
function isForbiddenFileName(filePath) {
	if (!filePath) {
		return false;
	}
	const base = fileBasename(filePath).toLowerCase();
	return (
		/(^|[._-])(shim|stub|placeholder|noop|dummy)([._-]|$)/.test(base) ||
		base.includes(".shim.") ||
		base.includes(".stub.") ||
		base.includes("-shim.") ||
		base.includes("-stub.")
	);
}

/**
 * Content patterns that signal incomplete / deferred work.
 * Standalone `// stub` / `// shim` markers only — not prose containing "shim".
 * @param {string} text
 * @returns {{ count: number, why: string | null }}
 */
function analyzeForbidden(text) {
	if (!text || typeof text !== "string") {
		return { count: 0, why: null };
	}

	const patterns = [
		{
			re: /\bnotImplemented\b|\bNotImplementedError\b/gi,
			why: "notImplemented / NotImplementedError",
		},
		{
			re: /throw\s+new\s+Error\s*\(\s*['"`][^'"`]*(TODO|FIXME|not\s*implemented|stub|shim)/gi,
			why: "throw Error used as stub/TODO",
		},
		{
			// Standalone marker comments only: `// stub` / `/* shim */` / `// shim — …`
			re: /(?:^|[\n\r])\s*(?:\/\/|\/\*)\s*(stub|shim)\b/gi,
			why: "stub/shim comment marker",
		},
		{
			re: /\btech\s*debt\b|\bacceptable\s+debt\b/gi,
			why: "tech debt allowance language",
		},
		{
			re: /\b(temporary\s+workaround|workaround\s+for\s+now|fix\s+later|ship\s+later|implement\s+later)\b/gi,
			why: "deferred-work / workaround language",
		},
		{
			re: /\b(leave\s+a\s+stub|stub\s+for\s+now|shim\s+for\s+(now|convenience)|placeholder\s+implementation)\b/gi,
			why: "explicit stub/shim/placeholder plan",
		},
		{
			re: /\bTODO:\s*implement\b|\bFIXME:\s*(implement|stub|shim)\b/gi,
			why: "TODO/FIXME standing in for real work",
		},
	];

	let count = 0;
	let why = null;

	for (const pattern of patterns) {
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
			payload.tool_input || payload.toolInput || {}
		);

	if (!WRITE_TOOLS.has(toolName)) {
		respond({ permission: "allow" });
		process.exit(0);
	}

	const { filePath, text, oldString } = extractPathAndText(toolName, toolInput);

	if (isBanSurfacePath(filePath) || isTestDoublePath(filePath)) {
		respond({ permission: "allow" });
		process.exit(0);
	}

	if (isForbiddenFileName(filePath)) {
		respond({
			permission: "deny",
			user_message:
				"Blocked: shim/stub/placeholder filenames are not allowed. Ship a real module or get an explicit exception this turn.",
			agent_message:
				"DENIED by no-shim-stub-tech-debt hook: forbidden filename. Do not create shim/stub/placeholder/noop/dummy files. Implement the real surface or stop and ask the user for an explicit written exception in this turn. Do not bypass by renaming.",
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
		user_message: `Blocked: ${next.why}. No shims, stubs, or tech-debt allowances.`,
		agent_message: `DENIED by no-shim-stub-tech-debt hook (${next.why}). Shims, stubs, placeholders, and tech-debt carve-outs are NOT ALLOWED. Remove the incomplete pattern and ship the real implementation, or stop and ask the user for an explicit written exception in this turn. Do not split/encode the edit to bypass the hook.`,
	});
	process.exit(0);
} catch (err) {
	respond({
		permission: "allow",
		agent_message: `no-shim-stub-tech-debt soft-fail (allow): ${String(err)}`,
	});
	process.exit(0);
}
