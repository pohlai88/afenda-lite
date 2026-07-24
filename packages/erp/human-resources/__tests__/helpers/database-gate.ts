/**
 * Shared fail-closed DATABASE_URL gate for HR Memory/Drizzle parity suites.
 *
 * - Sets `process.env.DATABASE_URL` from env or local `.env.local`
 * - CI / REQUIRE_DATABASE_TESTS=1 without URL throws (skip ≠ PASS)
 * - Local without URL may skip via `runDrizzleParity` / `hasDatabase`
 * - Drizzle describes require explicit outer-loop flag (or CI) so unit
 *   inner-loop files that import this helper do not hit Neon from `.env.local` alone
 */

import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";

const resolved = resolveDatabaseUrlForTests();

/** True when DATABASE_URL is available after resolution. */
export const hasDatabase = resolved.hasDatabase;

function requireDatabaseMode(): boolean {
	const ci = process.env.CI;
	const requireFlag = process.env.REQUIRE_DATABASE_TESTS;
	return (
		ci === "true" || ci === "1" || requireFlag === "1" || requireFlag === "true"
	);
}

/**
 * Gate for Drizzle/Neon parity describes.
 * Prefer `describe.runIf(runDrizzleParity)` or `describe.skipIf(!runDrizzleParity)`.
 *
 * Under CI / REQUIRE_DATABASE_TESTS=1, missing URL already threw in
 * `resolveDatabaseUrlForTests` — so a skip here cannot mask a required DB gap.
 */
export const runDrizzleParity = hasDatabase && requireDatabaseMode();
