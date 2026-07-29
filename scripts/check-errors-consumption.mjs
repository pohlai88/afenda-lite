import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const ERRORS_PACKAGE = "packages/foundation/errors";
const SKIP_DIR = new Set([
	"node_modules",
	".git",
	".next",
	".turbo",
	"dist",
	"build",
	"coverage",
	"test-results",
	"playwright-report",
	"_reference",
]);
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);

const protectedDefinitions = [
	[/\bclass\s+AppError\b/u, "AppError"],
	[/\b(?:export\s+)?const\s+ERROR_CODES\b/u, "ERROR_CODES"],
	[/\b(?:export\s+)?const\s+ERROR_HTTP_STATUS\b/u, "ERROR_HTTP_STATUS"],
	[/\bfunction\s+httpErrorBody\b/u, "httpErrorBody"],
	[/\bfunction\s+retryAfterSeconds\b/u, "retryAfterSeconds"],
	[/\bfunction\s+normalizeUnknown\b/u, "normalizeUnknown"],
	[/\bfunction\s+fromPostgresUnknown\b/u, "fromPostgresUnknown"],
];

const forbiddenDirectImportPrefixes = [
	"packages/data-plane/db/src/schema/",
	"packages/data-plane/db/drizzle/",
	"packages/surfaces/ui-system/src/components/",
	"packages/surfaces/ui-system/src/metadata/",
];

/** @type {{file: string; message: string}[]} */
const violations = [];

function normalizedRelative(pathname) {
	return relative(root, pathname).replace(/\\/g, "/");
}

function isSourceFile(name) {
	return SOURCE_EXTENSIONS.has(name.slice(name.lastIndexOf(".")));
}

function walk(directory) {
	let entries;
	try {
		entries = readdirSync(directory);
	} catch {
		return;
	}

	for (const name of entries) {
		if (SKIP_DIR.has(name)) {
			continue;
		}

		const fullPath = join(directory, name);
		let stats;
		try {
			stats = statSync(fullPath);
		} catch {
			continue;
		}

		if (stats.isDirectory()) {
			walk(fullPath);
			continue;
		}

		if (stats.isFile() && isSourceFile(name)) {
			checkFile(fullPath);
		}
	}
}

function checkFile(fullPath) {
	const rel = normalizedRelative(fullPath);
	const content = readFileSync(fullPath, "utf8");
	const isErrorsPackage = rel.startsWith(`${ERRORS_PACKAGE}/`);

	if (!isErrorsPackage) {
		for (const [pattern, symbol] of protectedDefinitions) {
			if (pattern.test(content)) {
				violations.push({
					file: rel,
					message: `competing shared error-kernel definition: ${symbol}`,
				});
			}
		}
	}

	if (
		forbiddenDirectImportPrefixes.some((prefix) => rel.startsWith(prefix)) &&
		/from\s+["']@afenda\/errors(?:\/[^"']*)?["']/u.test(content)
	) {
		violations.push({
			file: rel,
			message:
				"forbidden direct @afenda/errors import in schema, migration, or reusable UI primitive surface",
		});
	}
}

walk(join(root, "packages"));
walk(join(root, "apps"));

if (violations.length > 0) {
	console.error("check-errors-consumption: FAIL");
	for (const violation of violations) {
		console.error(`  - ${violation.file}: ${violation.message}`);
	}
	process.exit(1);
}

console.log("check-errors-consumption: ok");
