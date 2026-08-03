#!/usr/bin/env node
/**
 * pnpm check:package-internals — cross-package internal-source gate (ENV-GOV-1 D).
 *
 * Invariant:
 *
 *   Repository code must not resolve or execute another package's internal
 *   source outside that package's declared exports.
 *
 * This is deliberately narrower than "dynamic imports must take string
 * literals". A blanket literal-only rule would outlaw legitimate plugin
 * registries, locale loaders, and optional adapters while still leaving
 * `createRequire`, `new Function`, and subprocess execution open. The invariant
 * below is the one that actually matters, and it holds regardless of whether
 * the specifier is static, computed, or handed to a child process.
 *
 * Detected, in any string context:
 *   - `packages/<scope>/<name>/src/**` references built through resolve(),
 *     pathToFileURL(), require(), import(), or subprocess arguments
 *   - `@afenda/<pkg>/src/**` subpath specifiers
 *   - relative paths escaping a package into another package's src
 *
 * A file may reference its OWN package's src — that is internal cohesion, not a
 * boundary violation.
 *
 * Usage:
 *   pnpm check:package-internals
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);

const SCAN_ROOTS = ["scripts", "apps", "packages", "testing", "e2e"];
const SOURCE_EXTENSIONS = new Set([
	".ts",
	".tsx",
	".js",
	".jsx",
	".mjs",
	".cjs",
	".mts",
]);
const SKIP_DIRECTORIES = new Set([
	"node_modules",
	"dist",
	"build",
	".next",
	".turbo",
	"coverage",
	"test-results",
]);

/**
 * Resolution and execution call sites.
 *
 * The invariant is about *resolving or executing* another package's source, not
 * about naming a path. Governance scripts legitimately carry package source
 * paths as scan roots, glob bases, and diagnostic strings; flagging those would
 * make this gate fire on the repository's own tooling. Only paths flowing into
 * one of these call sites are violations.
 */
const RESOLUTION_CALL =
	/\b(?:import|require|pathToFileURL|createRequire|execFile|execFileSync|execSync|exec|spawnSync|spawn|fork)\s*\(/g;
/** How far after a call site to inspect for an internal-source argument. */
const CALL_ARGUMENT_WINDOW = 400;

/** `packages/<scope>/<name>/src/...` inside a resolution argument. */
const WORKSPACE_SRC_PATH = /packages\/([a-z0-9-]+)\/([a-z0-9-]+)\/src\//g;
/** `@afenda/<name>/src/...` subpath specifier — always a violation, static or dynamic. */
const AFENDA_SRC_SPECIFIER = /@afenda\/([a-z0-9-]+)\/src\//g;
/** Leading `packages/<scope>/<name>/` of a repo-relative file path. */
const OWNING_PACKAGE_PATH = /^packages\/([a-z0-9-]+)\/([a-z0-9-]+)\//;
/** Relative traversal that climbs out into another package tree, in an import position. */
const RELATIVE_ESCAPE = /from\s+["'](?:\.\.\/){2,}packages\//g;

const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;
const LINE_COMMENT = /(^|[^:])\/\/[^\n]*/g;

/**
 * Owned exceptions. Each entry states why the reference is legitimate and
 * cannot be expressed through package exports.
 *
 * Listed file-by-file rather than by excluding `__tests__` wholesale: a blanket
 * test-directory skip would also hide real violations in ordinary tests, and
 * would grow silently. `kind` separates permanent-by-design entries from debt,
 * so growth of the second is the signal rather than the total count.
 *
 * @type {ReadonlyArray<{file: string, reason: string, owner: string, kind: "permanent-by-design" | "debt"}>}
 */
const ALLOWLIST = [
	{
		file: "scripts/__tests__/check-audit-boundary.test.mjs",
		reason:
			"Negative fixture — must contain the violating specifier to prove check:audit-boundary fires.",
		owner: "repo-tooling",
		kind: "permanent-by-design",
	},
	{
		file: "scripts/__tests__/check-db-boundary.test.mjs",
		reason:
			"Negative fixture — must contain the violating specifier to prove check:db-boundary fires.",
		owner: "repo-tooling",
		kind: "permanent-by-design",
	},
	{
		file: "scripts/validate-modules/negative-fixtures.mjs",
		reason:
			"Negative fixture corpus for validate:modules — violating specifiers are the test inputs.",
		owner: "repo-tooling",
		kind: "permanent-by-design",
	},
];

function stripComments(source) {
	return source.replace(BLOCK_COMMENT, "").replace(LINE_COMMENT, "$1");
}

function collectSourceFiles(directory, found = []) {
	let entries;
	try {
		entries = readdirSync(directory);
	} catch {
		return found;
	}

	for (const entry of entries) {
		if (SKIP_DIRECTORIES.has(entry) || entry.startsWith(".")) {
			continue;
		}
		const absolute = path.join(directory, entry);
		const stats = statSync(absolute);
		if (stats.isDirectory()) {
			collectSourceFiles(absolute, found);
		} else if (SOURCE_EXTENSIONS.has(path.extname(entry))) {
			found.push(absolute);
		}
	}
	return found;
}

/** Owning workspace package of a file, as `<scope>/<name>`, or undefined. */
function owningPackage(relativePath) {
	const match = OWNING_PACKAGE_PATH.exec(relativePath);
	return match ? `${match[1]}/${match[2]}` : undefined;
}

/** Active scan base; overridden by `--root` for negative fixtures. */
let scanBase = repoRoot;

/** Package name declared by `packages/<scope>/<name>/package.json`. */
function declaredPackageName(scopeAndName) {
	try {
		const manifest = JSON.parse(
			readFileSync(
				path.join(scanBase, "packages", scopeAndName, "package.json"),
				"utf8",
			),
		);
		return typeof manifest.name === "string" ? manifest.name : undefined;
	} catch {
		// Absent or malformed manifest — the caller treats the owner as unknown,
		// which is the conservative choice: the deep-import rule still applies.
	}
}

function checkFile(relativePath, source, violations) {
	if (ALLOWLIST.some((entry) => entry.file === relativePath)) {
		return;
	}

	const content = stripComments(source);
	const owner = owningPackage(relativePath);
	const ownerPackageName = owner ? declaredPackageName(owner) : undefined;

	// Internal source reached through a resolution or execution call.
	for (const call of content.matchAll(RESOLUTION_CALL)) {
		const argumentRegion = content.slice(
			call.index,
			call.index + CALL_ARGUMENT_WINDOW,
		);
		for (const match of argumentRegion.matchAll(WORKSPACE_SRC_PATH)) {
			const target = `${match[1]}/${match[2]}`;
			if (target === owner) {
				continue; // own package internals — cohesion, not a boundary crossing
			}
			violations.push(
				`${relativePath}: ${call[0].slice(0, -1)}() resolves internal source of packages/${target} — consume its declared export instead`,
			);
		}
	}

	// `@afenda/<pkg>/src/**` is never a declared entrypoint, in any position.
	for (const match of content.matchAll(AFENDA_SRC_SPECIFIER)) {
		if (ownerPackageName === `@afenda/${match[1]}`) {
			continue;
		}
		violations.push(
			`${relativePath}: deep-imports @afenda/${match[1]}/src — use a declared entrypoint`,
		);
	}

	for (const _match of content.matchAll(RELATIVE_ESCAPE)) {
		violations.push(
			`${relativePath}: relative import escapes into another package tree — use the package name`,
		);
	}
}

/**
 * Scan root override, used by negative fixtures to run the gate against a
 * synthetic package tree. A gate with no way to prove it fires is
 * indistinguishable from one that cannot.
 */
function resolveScanConfig() {
	const rootFlagIndex = process.argv.indexOf("--root");
	if (rootFlagIndex === -1) {
		return { base: repoRoot, roots: SCAN_ROOTS };
	}
	const override = process.argv[rootFlagIndex + 1];
	if (!override) {
		throw new Error("--root requires a directory path");
	}
	return { base: path.resolve(override), roots: ["."] };
}

function main() {
	const violations = [];
	const { base, roots } = resolveScanConfig();
	scanBase = base;

	for (const root of roots) {
		const absoluteRoot = path.join(base, root);
		for (const file of collectSourceFiles(absoluteRoot)) {
			const relativePath = path.relative(base, file).replaceAll(path.sep, "/");
			checkFile(relativePath, readFileSync(file, "utf8"), violations);
		}
	}

	if (violations.length > 0) {
		console.error("check-package-internals: FAIL");
		for (const violation of [...new Set(violations)].sort()) {
			console.error(`  - ${violation}`);
		}
		console.error(
			"\nCross-package internal source must be consumed through declared package exports.",
		);
		process.exit(1);
	}

	console.log("check-package-internals: ok");
}

main();
