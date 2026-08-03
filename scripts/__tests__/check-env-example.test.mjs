/**
 * Negative fixtures for check:env-example (ENV-GOV-1 F).
 *
 * The suite proves both strictness and usability: the gate must reject the ten
 * ways a committed template goes wrong, and must not object to the ordinary
 * things a readable template contains — comments, blank lines, ordering, and
 * quoted values.
 *
 * Fixture policies use real governed key names because the checker verifies
 * policy entries against the live classification ledger.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../..",
);
const checker = path.join(repoRoot, "scripts/check-env-example.mjs");
const fixtureParent = path.join(
	repoRoot,
	"node_modules/.cache/env-example-fixtures",
);
const POLICY_PATH = "packages/foundation/env/src/env-template-policy.json";

const BASE_POLICY = {
	placeholderPattern: "\\[[a-z0-9-]+\\]",
	keys: {
		DATABASE_URL: {
			source: "developer",
			requirement: "required",
			sensitivity: "secret",
			reason: "Connection string embedding a password.",
		},
		APP_URL: {
			source: "developer",
			requirement: "required",
			sensitivity: "public",
			reason: "Product origin.",
		},
		NEON_API_KEY: {
			source: "developer",
			requirement: "optional",
			sensitivity: "secret",
			reason: "Local ops only.",
		},
		CRON_SECRET: {
			source: "platform",
			requirement: "prohibited",
			sensitivity: "secret",
			reason: "Platform-injected; must not ship in the developer template.",
		},
	},
};

const VALID_TEMPLATE = [
	"# Local runtime template.",
	"",
	"DATABASE_URL=",
	"APP_URL=https://example.test",
	"",
	"# Optional local ops key.",
	"NEON_API_KEY=",
	"",
].join("\n");

const tsxCli = path.join(repoRoot, "node_modules/tsx/dist/cli.mjs");

function runChecker(root) {
	try {
		// Through tsx, exactly as the registered gate runs it. Plain node cannot
		// import the TypeScript contract entrypoint, which would silently disable
		// stale-entry parity and make the fixture prove nothing.
		const stdout = execFileSync(
			process.execPath,
			[tsxCli, checker, "--root", root],
			{
				cwd: repoRoot,
				encoding: "utf8",
				stdio: "pipe",
			},
		);
		return { ok: true, output: stdout };
	} catch (error) {
		return {
			ok: false,
			output: `${error.stdout ?? ""}${error.stderr ?? ""}` || String(error),
		};
	}
}

describe("check:env-example", () => {
	const roots = [];

	beforeAll(() => () => {
		for (const root of roots) {
			rmSync(root, { recursive: true, force: true });
		}
	});

	function fixture(
		name,
		{ template = VALID_TEMPLATE, policy = BASE_POLICY } = {},
	) {
		mkdirSync(fixtureParent, { recursive: true });
		const root = mkdtempSync(path.join(fixtureParent, `${name}-`));
		roots.push(root);
		mkdirSync(path.join(root, path.dirname(POLICY_PATH)), { recursive: true });
		writeFileSync(
			path.join(root, POLICY_PATH),
			JSON.stringify(policy, null, 2),
		);
		writeFileSync(path.join(root, ".env.example"), template);
		return root;
	}

	it("accepts a valid complete template", () => {
		const result = runChecker(fixture("valid"));
		expect(result.ok).toBe(true);
		expect(result.output).toContain("check-env-example: ok");
	});

	it("accepts comments, blank lines, ordering, quotes, and export syntax", () => {
		const result = runChecker(
			fixture("cosmetic", {
				template: [
					"",
					"#### Section ####",
					'APP_URL="https://example.test"',
					"",
					"export DATABASE_URL=",
					"# trailing comment",
					"NEON_API_KEY=''",
					"",
				].join("\n"),
			}),
		);
		expect(result.ok).toBe(true);
	});

	it("accepts a bracketed placeholder for a secret", () => {
		const result = runChecker(
			fixture("placeholder", {
				template: VALID_TEMPLATE.replace(
					"DATABASE_URL=",
					"DATABASE_URL=postgresql://user:[password]@host/db",
				),
			}),
		);
		expect(result.ok).toBe(true);
	});

	it("rejects a missing required developer key", () => {
		const result = runChecker(
			fixture("missing-required", {
				template: VALID_TEMPLATE.replace("APP_URL=https://example.test\n", ""),
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.output).toContain(
			"required developer key APP_URL is missing",
		);
	});

	it("rejects an undeclared template key", () => {
		const result = runChecker(
			fixture("unknown-key", {
				template: `${VALID_TEMPLATE}SOME_NEW_FLAG=true\n`,
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.output).toContain("is not declared in the template policy");
	});

	it("rejects a duplicate key", () => {
		const result = runChecker(
			fixture("duplicate", {
				template: `${VALID_TEMPLATE}APP_URL=https://other.test\n`,
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.output).toContain("duplicate key APP_URL");
	});

	it("rejects a prohibited platform key", () => {
		const result = runChecker(
			fixture("prohibited", { template: `${VALID_TEMPLATE}CRON_SECRET=\n` }),
		);
		expect(result.ok).toBe(false);
		expect(result.output).toContain(
			"must not appear in the committed template",
		);
	});

	it("rejects a secret with a committed value", () => {
		const result = runChecker(
			fixture("committed-secret", {
				template: VALID_TEMPLATE.replace(
					"NEON_API_KEY=",
					"NEON_API_KEY=napi_realsecretvalue123",
				),
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.output).toContain("must be empty or a bracketed placeholder");
	});

	it("rejects an obsolete alias", () => {
		const result = runChecker(
			fixture("legacy-alias", {
				template: `${VALID_TEMPLATE}POSTGRES_URL=\n`,
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.output).toContain("obsolete alias");
	});

	it("rejects a malformed line rather than skipping it", () => {
		// Silent skipping is how a template passes a check it never received.
		const result = runChecker(
			fixture("malformed", {
				template: `${VALID_TEMPLATE}this is not a assignment\n`,
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.output).toContain("malformed line");
	});

	it("rejects a stale policy entry no longer governed by the schema", () => {
		const result = runChecker(
			fixture("stale-policy", {
				policy: {
					...BASE_POLICY,
					keys: {
						...BASE_POLICY.keys,
						RETIRED_LEGACY_SETTING: {
							source: "developer",
							requirement: "optional",
							sensitivity: "public",
							reason: "No longer part of the schema.",
						},
					},
				},
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.output).toContain("no longer a governed environment key");
	});

	it("rejects a policy entry with no reason", () => {
		const result = runChecker(
			fixture("no-reason", {
				policy: {
					...BASE_POLICY,
					keys: {
						...BASE_POLICY.keys,
						APP_URL: { ...BASE_POLICY.keys.APP_URL, reason: "  " },
					},
				},
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.output).toContain("has no reason");
	});
});
