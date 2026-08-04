/**
 * Pure placement rules for directory-local-scripts hook.
 * Keep scripts with their owning directory; forbid dumps into root scripts/.
 */
import { normalizePath } from "./hook-policy.mjs";

/** Path segments that own a nested `scripts/` directory (not repo-root scripts/). */
const NESTED_SCRIPT_OWNERS = new Set([
	"governance",
	"packages",
	"apps",
	"docs",
	".cursor",
	"node_modules",
]);

/** Agent scratch / dump basenames under root scripts/. */
const TEMP_DUMP_BASENAME =
	/^(?:_tmp|_write|_fix|_staging|_kit|_polish|_patch)[._-]|^(?:tmp|temp|scratch)[-_]/i;

/** Domain-owned script names that must not land in root scripts/. */
const DOMAIN_OWNED_IN_ROOT =
	/(?:kernel[-_]?governance|generate[._-]?readme|readme[._-]?kit|agents?[._-]?kit|template[._-]?kit|doc[._-]?template)/i;

/** Executable script extensions forbidden under docs/template/. */
const TEMPLATE_SCRIPT_EXT = /\.(?:[cm]?[jt]s|mts|cts|tsx)$/i;

/**
 * True only for repo-root `scripts/**`, not `governance/scripts/**` etc.
 * @param {string} filePath
 */
export function isRepoRootScriptsPath(filePath) {
	const parts = normalizePath(filePath).split("/").filter(Boolean);
	const scriptsIdx = parts.findIndex((segment) => segment.toLowerCase() === "scripts");
	if (scriptsIdx === -1) {
		return false;
	}
	const before = parts.slice(0, scriptsIdx);
	return !before.some((segment) => NESTED_SCRIPT_OWNERS.has(segment.toLowerCase()));
}

/**
 * @param {string} filePath
 * @returns {string | null} relative path under root scripts/ (posix), or null
 */
function rootScriptsTail(filePath) {
	if (!isRepoRootScriptsPath(filePath)) {
		return null;
	}
	const parts = normalizePath(filePath).split("/").filter(Boolean);
	const scriptsIdx = parts.findIndex((segment) => segment.toLowerCase() === "scripts");
	return parts.slice(scriptsIdx + 1).join("/");
}

/**
 * @param {string} filePath
 * @returns {string | null} violation reason
 */
export function scriptPlacementViolation(filePath) {
	if (!filePath) {
		return null;
	}
	const p = normalizePath(filePath);

	if (/(?:^|\/)docs\/template\//i.test(p) && TEMPLATE_SCRIPT_EXT.test(p)) {
		return `executable under docs/template/ ('${p}') — kit is markdown-only; hand-copy templates, no generators`;
	}

	const tail = rootScriptsTail(filePath);
	if (tail === null || tail.length === 0) {
		return null;
	}

	const basename = tail.split("/")[0] ?? "";
	if (
		TEMP_DUMP_BASENAME.test(basename) ||
		/^(?:_staging|_tmp|_write|_fix|_kit)(?:\/|$)/i.test(tail)
	) {
		return `temp/agent dump in root scripts/ ('${tail}') — keep co-located with the owning directory; do not park dumps in scripts/`;
	}
	if (DOMAIN_OWNED_IN_ROOT.test(tail)) {
		return `domain/kit script in root scripts/ ('${tail}') — put kernel governance under governance/scripts/; README/AGENTS kits stay markdown under docs/template/ (no root script generators)`;
	}
	return null;
}

/**
 * @param {string} command
 * @returns {string | null}
 */
export function shellScriptDumpViolation(command) {
	if (!command) {
		return null;
	}
	const cmd = command.replace(/\\/g, "/");

	// Only treat as a dump when the command looks like a write into the path
	// (redirect, Set-Content, writeFile, copy/move into target) — not a mere mention.
	const writePrefix =
		/(?:^|[;&|(`\s])(?:Set-Content|Add-Content|Out-File|Copy-Item|Move-Item|New-Item|tee|cp|mv|cat)\b|\bwriteFile(?:Sync)?\s*\(|(?:^|[;&|]\s*)>[>]?/;

	const dumpTargets = [
		{
			pattern:
				/(?:^|[^/\w])scripts\/(?:_tmp|_write|_fix|_staging|_kit|_polish|_patch)[^/\s"'`]*/i,
			label: "root scripts/ temp dump",
		},
		{
			pattern:
				/(?:^|[^/\w])scripts\/[^/\s"'`]*(?:kernel[-_]?governance|generate[._-]?readme|readme[._-]?kit|template[._-]?kit)[^/\s"'`]*/i,
			label: "root scripts/ domain/kit body",
		},
		{
			pattern: /docs\/template\/[^/\s"'`]*\.(?:[cm]?[jt]s|mts|cts|tsx)\b/i,
			label: "docs/template executable",
		},
	];

	for (const { pattern, label } of dumpTargets) {
		const match = cmd.match(pattern);
		if (match === null) {
			continue;
		}
		const matched = match[0].replace(/^[^sS]*/, "");
		const index = match.index ?? 0;
		const windowStart = Math.max(0, index - 80);
		const before = cmd.slice(windowStart, index);
		if (writePrefix.test(before) || /[>]{1,2}\s*$/.test(before.trimEnd())) {
			return `shell would write ${label} (${matched})`;
		}
	}
	return null;
}
