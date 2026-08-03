#!/usr/bin/env tsx
/**
 * pnpm check:package-policy — declarative package contract gate (ENV-GOV-1 C).
 *
 * Turns architectural claims that currently live in prose ("Rank-1 Platform
 * leaf", "these entrypoints are pure") into checked facts.
 *
 * The policy declares meaning; this checker reads reality:
 *
 *   policy.publicEntrypointKinds  ↔  package.json#exports        (parity + targets exist)
 *   policy.role / permitted deps  ↔  package.json#dependencies   (dependency direction)
 *   kind: "pure-governance"       ↔  static import graph         (no runtime reachability)
 *   policy.forbiddenImportPrefixes ↔ package source              (no forbidden reach)
 *
 * The purity rule is enforced statically here and dynamically by the package's
 * import-isolation tests. Both are wanted: the static rule explains *which
 * import* broke purity, the runtime test proves purity actually holds.
 *
 * Usage:
 *   pnpm check:package-policy
 *   pnpm check:package-policy --package packages/foundation/env
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);

type EntrypointKind = "runtime-product" | "runtime-docs" | "pure-governance";

interface PackagePolicy {
	forbiddenImportPrefixes: readonly string[];
	layer: string;
	permittedWorkspaceRuntimeDependencies: readonly string[];
	publicEntrypointKinds: Record<string, EntrypointKind>;
	role: string;
}

/**
 * Packages under policy, and where each one's policy document lives.
 *
 * Policies are JSON and read, never imported: importing a package's internal
 * module from a repository script is the very thing `check:package-internals`
 * forbids, and this gate should not need an exception to its sibling.
 */
const GOVERNED_PACKAGES = [
	{
		packageDir: "packages/foundation/env",
		policyDocument: "src/package-policy.json",
	},
] as const;

const RELATIVE_IMPORT =
	/(?:^|\n)\s*(?:import|export)[^;\n]*?from\s+["'](\.[^"']+)["']/g;
const DYNAMIC_RELATIVE_IMPORT = /import\s*\(\s*["'](\.[^"']+)["']\s*\)/g;

const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;
const LINE_COMMENT = /(^|[^:])\/\/[^\n]*/g;

/**
 * Documentation routinely contains example import statements. Matching those
 * would make the gate fire on a package's own usage docs — a false positive
 * that teaches people to distrust the gate.
 */
function stripComments(source: string): string {
	return source.replace(BLOCK_COMMENT, "").replace(LINE_COMMENT, "$1");
}

function readJson(filePath: string): Record<string, unknown> {
	return JSON.parse(readFileSync(filePath, "utf8"));
}

/** Resolve an extensionless relative specifier to a real file. */
function resolveRelative(
	fromFile: string,
	specifier: string,
): string | undefined {
	const base = path.resolve(path.dirname(fromFile), specifier);
	const candidates = [
		base,
		`${base}.ts`,
		`${base}.tsx`,
		path.join(base, "index.ts"),
	];
	return candidates.find((candidate) => existsSync(candidate));
}

/** Every module reachable from `entryFile` through relative imports. */
function reachableModules(entryFile: string): Set<string> {
	const seen = new Set<string>();
	const queue = [entryFile];

	while (queue.length > 0) {
		const current = queue.pop();
		if (!current || seen.has(current)) {
			continue;
		}
		seen.add(current);

		const source = stripComments(readFileSync(current, "utf8"));
		const specifiers = [
			...[...source.matchAll(RELATIVE_IMPORT)].map((match) => match[1]),
			...[...source.matchAll(DYNAMIC_RELATIVE_IMPORT)].map((match) => match[1]),
		];
		for (const specifier of specifiers) {
			const resolved = resolveRelative(current, specifier);
			if (resolved) {
				queue.push(resolved);
			}
		}
	}

	return seen;
}

interface PackageContext {
	absolutePackage: string;
	exportsMap: Record<string, { default?: string; types?: string }>;
	manifest: Record<string, unknown>;
	packageDir: string;
	policy: PackagePolicy;
}

/** Relative module path for diagnostics. */
function moduleLabel(context: PackageContext, module: string): string {
	return path
		.relative(context.absolutePackage, module)
		.replaceAll(path.sep, "/");
}

/** 1. Policy and exports must describe the same public surface. */
function checkEntrypointParity(context: PackageContext, violations: string[]) {
	const declared = new Set(Object.keys(context.policy.publicEntrypointKinds));
	const actual = new Set(Object.keys(context.exportsMap));

	for (const entry of actual) {
		if (!declared.has(entry)) {
			violations.push(
				`${context.packageDir}: exports "${entry}" is not classified in package policy — declare its entrypoint kind`,
			);
		}
	}
	for (const entry of declared) {
		if (!actual.has(entry)) {
			violations.push(
				`${context.packageDir}: policy declares "${entry}" but package.json#exports does not`,
			);
		}
	}
}

/** 2. Export targets must exist on disk. Returns the resolved entry files. */
function resolveEntryFiles(
	context: PackageContext,
	violations: string[],
): Map<string, string> {
	const entryFiles = new Map<string, string>();

	for (const [entry, target] of Object.entries(context.exportsMap)) {
		const targetPath = target?.default;
		if (!targetPath) {
			violations.push(
				`${context.packageDir}: exports "${entry}" has no default target`,
			);
			continue;
		}
		const absoluteTarget = path.join(context.absolutePackage, targetPath);
		if (existsSync(absoluteTarget)) {
			entryFiles.set(entry, absoluteTarget);
		} else {
			violations.push(
				`${context.packageDir}: exports "${entry}" points at missing file ${targetPath}`,
			);
		}
	}

	return entryFiles;
}

/** 3. A leaf carries no workspace runtime dependencies. */
function checkDependencyDirection(
	context: PackageContext,
	violations: string[],
) {
	const runtimeDependencies = Object.keys(
		(context.manifest.dependencies ?? {}) as Record<string, string>,
	);
	const permitted = new Set(
		context.policy.permittedWorkspaceRuntimeDependencies,
	);

	for (const dependency of runtimeDependencies) {
		if (dependency.startsWith("@afenda/") && !permitted.has(dependency)) {
			violations.push(
				`${context.packageDir}: ${context.policy.role} package declares workspace runtime dependency ${dependency}`,
			);
		}
	}
}

/** 4. Nothing reachable from a pure entrypoint may reach a runtime entrypoint. */
function checkEntrypointPurity(
	context: PackageContext,
	entryFiles: Map<string, string>,
	violations: string[],
) {
	const runtimeEntryFiles = new Set(
		Object.entries(context.policy.publicEntrypointKinds)
			.filter(([, kind]) => kind !== "pure-governance")
			.map(([entry]) => entryFiles.get(entry))
			.filter((file): file is string => file !== undefined),
	);

	for (const [entry, kind] of Object.entries(
		context.policy.publicEntrypointKinds,
	)) {
		const entryFile =
			kind === "pure-governance" ? entryFiles.get(entry) : undefined;
		if (!entryFile) {
			continue;
		}
		for (const module of reachableModules(entryFile)) {
			if (runtimeEntryFiles.has(module)) {
				violations.push(
					`${context.packageDir}: pure entrypoint "${entry}" reaches runtime module ${moduleLabel(context, module)} — importing it would initialize environment state`,
				);
			}
		}
	}
}

/** 5. No module the package exposes may import a forbidden prefix. */
function checkForbiddenPrefixes(
	context: PackageContext,
	entryFiles: Map<string, string>,
	violations: string[],
) {
	const allReachable = new Set<string>();
	for (const file of entryFiles.values()) {
		for (const module of reachableModules(file)) {
			allReachable.add(module);
		}
	}

	for (const module of allReachable) {
		const source = stripComments(readFileSync(module, "utf8"));
		for (const prefix of context.policy.forbiddenImportPrefixes) {
			const pattern = new RegExp(
				`from\\s+["']${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
			);
			if (pattern.test(source)) {
				violations.push(
					`${context.packageDir}: ${moduleLabel(context, module)} imports forbidden prefix ${prefix}`,
				);
			}
		}
	}
}

function checkPackage(
	packageDir: string,
	policy: PackagePolicy,
	violations: string[],
	base: string = repoRoot,
) {
	const absolutePackage = path.join(base, packageDir);
	const manifest = readJson(path.join(absolutePackage, "package.json"));
	const context: PackageContext = {
		packageDir,
		absolutePackage,
		policy,
		manifest,
		exportsMap: (manifest.exports ?? {}) as Record<
			string,
			{ default?: string; types?: string }
		>,
	};

	checkEntrypointParity(context, violations);
	const entryFiles = resolveEntryFiles(context, violations);
	checkDependencyDirection(context, violations);
	checkEntrypointPurity(context, entryFiles, violations);
	checkForbiddenPrefixes(context, entryFiles, violations);
}

const REQUIRED_POLICY_FIELDS = [
	"layer",
	"role",
	"permittedWorkspaceRuntimeDependencies",
	"publicEntrypointKinds",
	"forbiddenImportPrefixes",
] as const;

/**
 * Governed set, optionally overridden by `--package <dir>` so negative fixtures
 * can run the gate against a synthetic package. A gate with no way to prove it
 * fires is indistinguishable from one that cannot.
 */
function resolveGovernedPackages(): ReadonlyArray<{
	packageDir: string;
	policyDocument: string;
	base: string;
}> {
	const flagIndex = process.argv.indexOf("--package");
	if (flagIndex === -1) {
		return GOVERNED_PACKAGES.map((governed) => ({
			...governed,
			base: repoRoot,
		}));
	}
	const override = process.argv[flagIndex + 1];
	if (!override) {
		throw new Error("--package requires a directory path");
	}
	const absolute = path.resolve(override);
	return [
		{
			packageDir: path.basename(absolute),
			policyDocument: "src/package-policy.json",
			base: path.dirname(absolute),
		},
	];
}

function main() {
	const violations: string[] = [];

	for (const governed of resolveGovernedPackages()) {
		const policyPath = path.join(
			governed.base,
			governed.packageDir,
			governed.policyDocument,
		);
		if (!existsSync(policyPath)) {
			violations.push(
				`${governed.packageDir}: missing policy document ${governed.policyDocument}`,
			);
			continue;
		}

		const policy = readJson(policyPath) as unknown as PackagePolicy;
		const missing = REQUIRED_POLICY_FIELDS.filter(
			(field) => (policy as Record<string, unknown>)[field] === undefined,
		);
		if (missing.length > 0) {
			violations.push(
				`${governed.packageDir}: policy is missing required field(s) ${missing.join(", ")}`,
			);
			continue;
		}

		checkPackage(governed.packageDir, policy, violations, governed.base);
	}

	if (violations.length > 0) {
		console.error("check-package-policy: FAIL");
		for (const violation of [...new Set(violations)].sort()) {
			console.error(`  - ${violation}`);
		}
		process.exit(1);
	}

	console.log(
		`check-package-policy: ok (${GOVERNED_PACKAGES.length} governed package(s))`,
	);
}

try {
	main();
} catch (error: unknown) {
	console.error(
		`check-package-policy FAIL: ${error instanceof Error ? error.message : String(error)}`,
	);
	process.exit(1);
}
