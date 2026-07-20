/**
 * Cursor preToolUse hook — deny Living docs/ recreate and ghost ARCH SSOT.
 *
 * ARCH = DOC-001 Living Architecture class (docs/architecture/ARCH-NNN-*.md).
 * Bodies are dormant on this checkout; Scratch docs-V2 is operative SSOT.
 *
 * Stdin: { tool_name, tool_input, ... }
 * @see https://cursor.com/docs/hooks
 */
import {
	WRITE_TOOLS,
	extractPathAndText,
	isBanSurfacePath,
	normalizePath,
	readExistingFile,
	resolveResultText,
	respond,
} from "./hook-policy.mjs";
import { readHookPayload } from "./hook-stdin.mjs";

/**
 * Repo-root Living `docs/**` (not docs-V2, not apps/docs).
 * @param {string} filePath
 */
export function isLivingDocsPath(filePath) {
	if (!filePath) {
		return false;
	}
	const p = normalizePath(filePath);
	// Absolute or relative: …/docs/… but never …/docs-V2/… or …/apps/docs/…
	if (/(^|\/)apps\/docs(\/|$)/i.test(p)) {
		return false;
	}
	if (/(^|\/)docs-V2(\/|$)/i.test(p)) {
		return false;
	}
	return /(^|\/)docs(\/|$)/i.test(p);
}

/** Use RegExp ctor so path slashes cannot terminate literal regexes. */
const FORBIDDEN_PATTERNS = [
	{
		re: new RegExp("docs/architecture/ARCH-\\d+", "gi"),
		why: "Living ARCH path cited as on-disk SSOT",
	},
	{
		re: new RegExp("docs/architecture/adr/", "gi"),
		why: "Living ADR path cited as on-disk SSOT",
	},
	{
		re: new RegExp(
			"docs/architecture/(backend|frontend|system|tech-stack|archive)\\b",
			"gi",
		),
		why: "Banned Living architecture trunk cited",
	},
	{
		re: new RegExp(
			"\\b(restore|recreate|re-?materialize|check\\s*out)\\s+Living\\s+docs\\b",
			"gi",
		),
		why: "Living docs restore language",
	},
	{
		re: new RegExp("\\b(reopen|restore)\\s+docs/architecture\\b", "gi"),
		why: "docs/architecture reopen without Docs-lane",
	},
	{
		re: new RegExp(
			"\\bLiving\\s+ARCH-\\d+\\s+(on\\s+disk|file\\s+body|SSOT)\\b",
			"gi",
		),
		why: "claims Living ARCH body is on disk",
	},
];

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

	if (isLivingDocsPath(filePath)) {
		respond({
			permission: "deny",
			user_message:
				"Blocked: Living docs/ is dormant. Do not recreate docs/architecture or other Living controlled trees. Use docs-V2 Scratch until Docs-lane reopen.",
			agent_message:
				"DENIED by no-living-arch-ghost-ssot: Living docs/ path write. ARCH/ADR bodies are absent by design. Operative SSOT = docs-V2/** + farm companions. Stop unless the user named Docs-lane reopen / Living recovery this turn. Do not bypass by renaming.",
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
		user_message: `Blocked: ${next.why}. Use docs-V2 Scratch — not ghost Living ARCH paths.`,
		agent_message: `DENIED by no-living-arch-ghost-ssot (${next.why}). Do not cite missing Living docs/architecture/ARCH-* as on-disk SSOT. Prefer docs-V2/** · LAYERS.md · farm companions. ARCH-* IDs as dormant labels are OK; Living file bodies are not. Do not split/encode to bypass.`,
	});
	process.exit(0);
} catch (err) {
	respond({
		permission: "allow",
		agent_message: `no-living-arch-ghost-ssot soft-fail (allow): ${String(err)}`,
	});
	process.exit(0);
}
