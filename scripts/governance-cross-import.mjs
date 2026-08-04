#!/usr/bin/env node
/**
 * Production source under `@afenda/payroll` and `@afenda/human-resources` must
 * not import each other (bridging B7 `governance:cross-import`). Scans
 * package `src/` TypeScript only — tests may document the boundary.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const pairs = [
	{
		dir: "packages/erp/payroll/src",
		forbidden: ["@afenda/human-resources", "packages/erp/human-resources"],
		label: "@afenda/payroll",
	},
	{
		dir: "packages/erp/human-resources/src",
		forbidden: ["@afenda/payroll", "packages/erp/payroll"],
		label: "@afenda/human-resources",
	},
];

/**
 * @param {string} directory
 * @returns {string[]}
 */
function walkTypeScript(directory) {
	const entries = readdirSync(directory, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const absolute = join(directory, entry.name);
		if (entry.isDirectory()) {
			files.push(...walkTypeScript(absolute));
			continue;
		}
		if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
			files.push(absolute);
		}
	}
	return files;
}

/**
 * @param {string} source
 * @param {string} forbidden
 */
function importsForbidden(source, forbidden) {
	const escaped = forbidden.replaceAll("/", "\\/");
	return new RegExp(
		`(?:from|import\\(|require\\()\\s*["']${escaped}(?:/[^"']*)?["']`,
	).test(source);
}

const violations = [];
for (const pair of pairs) {
	const packageRoot = join(root, pair.dir);
	for (const file of walkTypeScript(packageRoot)) {
		const source = readFileSync(file, "utf8");
		for (const forbidden of pair.forbidden) {
			if (!importsForbidden(source, forbidden)) {
				continue;
			}
			const relative = file.slice(root.length + 1).replaceAll("\\", "/");
			violations.push(
				`${pair.label}: ${relative} imports forbidden peer surface ${forbidden}`,
			);
		}
	}
}

if (violations.length > 0) {
	console.error("governance:cross-import FAILED");
	for (const violation of violations) {
		console.error(`  ${violation}`);
	}
	process.exit(1);
}

console.log(
	"governance:cross-import OK (payroll ↔ human-resources production source)",
);
