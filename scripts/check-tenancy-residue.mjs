/**
 * N9 / ARCH-023 R1 — static scan for soft tenancy residue.
 *
 * Denies fail-open dual-mode `(organization_id IS NULL OR = $org)` and the
 * Drizzle equivalent `or(isNull(...organizationId), eq(...organizationId, …))`.
 *
 * System-template `isNull(platformRole.organizationId)` alone (with
 * `isSystemTemplate`) is allowed — that is not soft dual-mode on tenant roots.
 *
 * Usage: pnpm check:tenancy-residue
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["apps/web", "packages"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const SKIP_DIR_NAMES = new Set([
	"node_modules",
	".next",
	"dist",
	"coverage",
	".turbo",
]);

/** Soft dual-mode SQL / prose that authorizes R1 in product code. */
const FORBIDDEN = [
	{
		id: "sql-null-or-org",
		re: /organization_id\s+IS\s+NULL\s+OR/i,
	},
	{
		id: "drizzle-or-isnull-eq-org",
		re: /or\s*\(\s*isNull\s*\([^)]*organizationId[^)]*\)\s*,\s*eq\s*\([^)]*organizationId/i,
	},
	{
		id: "soft-null-or-org-allow",
		// Ban comments/code that authorize soft dual-mode (not the Decision-lock ban text).
		re: /\b(allow|use|enable|keep)\b[^\n]{0,80}\(NULL\s+OR\s+org\)/i,
	},
];

function walk(dir, out) {
	let entries;
	try {
		entries = readdirSync(dir);
	} catch {
		return;
	}
	for (const name of entries) {
		if (SKIP_DIR_NAMES.has(name)) {
			continue;
		}
		const full = join(dir, name);
		let st;
		try {
			st = statSync(full);
		} catch {
			continue;
		}
		if (st.isDirectory()) {
			walk(full, out);
			continue;
		}
		const ext = name.slice(name.lastIndexOf("."));
		if (!EXTENSIONS.has(ext)) {
			continue;
		}
		out.push(full);
	}
}

const files = [];
for (const root of ROOTS) {
	walk(join(process.cwd(), root), files);
}

const findings = [];

for (const file of files) {
	const text = readFileSync(file, "utf8");
	const lines = text.split(/\r?\n/);
	for (let i = 0; i < lines.length; i += 1) {
		const line = lines[i];
		// Decision-lock ban prose is allowed (documents the prohibition).
		if (
			/\b(never|forbid|forbidden|reject|rejected|ban|do not)\b/i.test(line) &&
			/\(NULL\s+OR\s+org\)|IS\s+NULL\s+OR/i.test(line)
		) {
			continue;
		}
		for (const rule of FORBIDDEN) {
			if (rule.re.test(line)) {
				findings.push({
					file: relative(process.cwd(), file).replaceAll("\\", "/"),
					line: i + 1,
					rule: rule.id,
					text: line.trim().slice(0, 160),
				});
			}
		}
	}
}

if (findings.length > 0) {
	console.error("check:tenancy-residue FAIL — soft tenancy residue found:");
	for (const f of findings) {
		console.error(`  ${f.file}:${f.line} [${f.rule}] ${f.text}`);
	}
	process.exit(1);
}

console.log(
	`check:tenancy-residue PASS — scanned ${files.length} files, no soft dual-mode residue`,
);
process.exit(0);
