/**
 * Canonical repository path classification for governance gates (GOV-REG-2).
 *
 * Each checker used to own its own traversal semantics, which drifted:
 * `errors-boundary` excluded `__tests__`, `metrics-boundary` excluded one named
 * file, and db/events/search/notifications excluded nothing — so those four
 * rediscovered their own negative fixtures as real violations and had been red
 * for as long as they had fixtures.
 *
 * The fix is deliberately narrow.
 *
 *   Governance gates must exclude their registered synthetic fixtures from
 *   production scans, while continuing to govern real test and production
 *   source according to an explicit per-gate scope.
 *
 * NOT "ignore __tests__". A test can establish a forbidden dependency, reach
 * into another package's internals, or execute unsupported APIs; excluding all
 * test source would trade four false positives for a permanent blind spot.
 *
 * The excluded set is *derived from the registry*, so a fixture is exempt
 * precisely because a gate declares it — never because of a folder name.
 */

import path from "node:path";
import { GOVERNANCE_GATES } from "./governance-gates.mjs";

/**
 * @typedef {"production-source" | "test-source" | "governance-fixture"
 *   | "generated" | "vendor" | "build-output"} RepositorySourceKind
 */

/** Directories that are never governed source, for any gate. */
export const NON_SOURCE_DIRECTORIES = new Set([
	"node_modules",
	".git",
	".next",
	".turbo",
	"dist",
	"build",
	"coverage",
	"test-results",
	"playwright-report",
	"storybook-static",
	"_reference",
	".pnpm-store-temp",
]);

const TEST_FILE = /\.(?:test|spec)\.[cm]?[jt]sx?$/u;

/** Registered negative-fixture paths, the only fixture exemption there is. */
const REGISTERED_FIXTURES = new Set(
	GOVERNANCE_GATES.map((gate) => gate.negativeFixture).filter(Boolean),
);

export function normalizeRelative(relativePath) {
	return relativePath.replaceAll(path.sep, "/").replaceAll("\\", "/");
}

/**
 * Is this path a negative fixture declared by some registered gate?
 *
 * Matches the exact file or anything beneath it, so a fixture may later become
 * a directory corpus without changing callers.
 */
export function isGovernanceFixture(relativePath) {
	const normalized = normalizeRelative(relativePath);
	for (const fixture of REGISTERED_FIXTURES) {
		if (normalized === fixture || normalized.startsWith(`${fixture}/`)) {
			return true;
		}
	}
	return false;
}

/** Registered fixture paths, for self-scan invariant tests. */
export function governanceFixturePaths() {
	return [...REGISTERED_FIXTURES];
}

/**
 * Classify a repository-relative path.
 *
 * Classification is shared; the *include set* is not. Each gate decides which
 * kinds it governs, and that choice should be explicit rather than buried in
 * bespoke recursion.
 *
 * @returns {RepositorySourceKind}
 */
export function classifyPath(relativePath) {
	const normalized = normalizeRelative(relativePath);

	if (isGovernanceFixture(normalized)) {
		return "governance-fixture";
	}
	if (normalized.includes("/node_modules/")) {
		return "vendor";
	}
	if (
		normalized.includes("/dist/") ||
		normalized.includes("/.next/") ||
		normalized.includes("/build/")
	) {
		return "build-output";
	}
	if (
		normalized.includes("/__generated__/") ||
		normalized.endsWith(".gen.ts")
	) {
		return "generated";
	}
	if (normalized.includes("/__tests__/") || TEST_FILE.test(normalized)) {
		return "test-source";
	}
	return "production-source";
}
