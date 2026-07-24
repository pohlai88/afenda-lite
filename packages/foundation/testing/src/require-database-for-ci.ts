/**
 * GUIDE-018 I5.5 — fail-closed DATABASE_URL for Vitest DB suites.
 *
 * Local without DATABASE_URL may skip (skip is not a CI PASS claim).
 * CI / REQUIRE_DATABASE_TESTS=1 without DATABASE_URL throws — never skip-as-PASS.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
	"..",
	"..",
	"..",
);

function requireDatabaseInCi(): boolean {
	const ci = process.env.CI;
	const requireFlag = process.env.REQUIRE_DATABASE_TESTS;
	return (
		ci === "true" || ci === "1" || requireFlag === "1" || requireFlag === "true"
	);
}

function loadDatabaseUrlFromEnvLocal(): string | undefined {
	try {
		const text = readFileSync(path.join(repoRoot, ".env.local"), "utf8");
		for (const line of text.split(/\r?\n/)) {
			const trimmed = line.trim();
			if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
			const match = /^DATABASE_URL\s*=\s*(.*)$/.exec(trimmed);
			if (!match) continue;
			let value = match[1]?.trim() ?? "";
			if (
				(value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))
			) {
				value = value.slice(1, -1);
			}
			return value.length > 0 ? value : undefined;
		}
	} catch {
		return undefined;
	}
	return undefined;
}

export type DatabaseForTests = {
	databaseUrl: string | undefined;
	hasDatabase: boolean;
};

/**
 * Resolve DATABASE_URL (env or `.env.local`), set `process.env.DATABASE_URL`
 * when found, and fail closed under CI when missing.
 */
export function resolveDatabaseUrlForTests(): DatabaseForTests {
	const fromEnv =
		typeof process.env.DATABASE_URL === "string" &&
		process.env.DATABASE_URL.length > 0
			? process.env.DATABASE_URL
			: undefined;
	// CI only trusts injected env (Actions secret). Local may use `.env.local`.
	const databaseUrl = requireDatabaseInCi()
		? fromEnv
		: (fromEnv ?? loadDatabaseUrlFromEnvLocal());
	if (databaseUrl) {
		process.env.DATABASE_URL = databaseUrl;
	}

	const hasDatabase = typeof databaseUrl === "string" && databaseUrl.length > 0;

	if (requireDatabaseInCi() && !hasDatabase) {
		throw new Error(
			"I5.5 CI DB gate BLOCKED — DATABASE_URL missing under CI/REQUIRE_DATABASE_TESTS=1. " +
				"Set Actions secret DATABASE_URL (repo or production env). Owner: Platform. " +
				"Skip is not PASS.",
		);
	}

	return { databaseUrl, hasDatabase };
}
