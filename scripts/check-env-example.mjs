#!/usr/bin/env node
/**
 * pnpm check:env-example — committed template parity gate (ENV-GOV-1 F).
 *
 * Verifies `.env.example` against the declared template policy in
 * `packages/foundation/env/src/env-template-policy.json`.
 *
 * Deny-by-default: a template key with no policy entry fails. Adding a key to
 * the committed template is therefore a reviewed decision, not an edit nobody
 * notices. Stale policy entries fail too — the parity runs in both directions.
 *
 * Malformed lines are reported rather than skipped. A parser that silently
 * ignores what it cannot read reports "ok" for a template it never checked.
 *
 * Usage:
 *   pnpm check:env-example
 *   pnpm check:env-example --root <dir>   # negative fixtures
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);

const TEMPLATE_FILE = ".env.example";
const POLICY_FILE = "packages/foundation/env/src/env-template-policy.json";

/** Historical names that must never reappear in the committed template. */
const LEGACY_ENV_ALIASES = new Set([
	"POSTGRES_URL",
	"POSTGRES_PRISMA_URL",
	"NEON_DATABASE_URL",
	"NEXTAUTH_URL",
	"AUTH_URL",
	"PUBLIC_APP_URL",
	"REDIS_URL",
	"UPSTASH_URL",
]);

const LINE_BREAK = /\r?\n/;
const ASSIGNMENT = /^(export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/;
const COMMENT_OR_BLANK = /^\s*(#.*)?$/;
const SOURCES = new Set(["developer", "platform", "ci", "derived"]);
const REQUIREMENTS = new Set(["required", "optional", "prohibited"]);
const SENSITIVITIES = new Set(["public", "secret"]);

/**
 * Parse the template.
 *
 * Comments, blank lines, and ordering are insignificant. `export KEY=` is
 * accepted because it is valid in shell-sourced templates; anything else that
 * is not a comment, blank, or assignment is a malformed line and reported.
 */
export function parseTemplate(source) {
	const entries = [];
	const malformed = [];

	source.split(LINE_BREAK).forEach((rawLine, index) => {
		const line = rawLine.trimEnd();
		const lineNumber = index + 1;

		if (COMMENT_OR_BLANK.test(line)) {
			return;
		}

		const match = ASSIGNMENT.exec(line);
		if (!match) {
			malformed.push({ lineNumber, line });
			return;
		}

		let value = match[3].trim();
		// Strip a single matched quote pair so quoted and unquoted forms compare equal.
		if (
			value.length >= 2 &&
			((value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'")))
		) {
			value = value.slice(1, -1);
		}

		entries.push({ key: match[2], value, lineNumber });
	});

	return { entries, malformed };
}

function validatePolicyShape(policy, governedKeys, problems) {
	for (const [key, descriptor] of Object.entries(policy.keys ?? {})) {
		if (!SOURCES.has(descriptor.source)) {
			problems.push(
				`${POLICY_FILE}: ${key} has invalid source "${descriptor.source}"`,
			);
		}
		if (!REQUIREMENTS.has(descriptor.requirement)) {
			problems.push(
				`${POLICY_FILE}: ${key} has invalid requirement "${descriptor.requirement}"`,
			);
		}
		if (!SENSITIVITIES.has(descriptor.sensitivity)) {
			problems.push(
				`${POLICY_FILE}: ${key} has invalid sensitivity "${descriptor.sensitivity}"`,
			);
		}
		if (!descriptor.reason?.trim()) {
			problems.push(`${POLICY_FILE}: ${key} has no reason`);
		}
		// Stale-entry parity: a policy key must still be governed by the schema.
		if (governedKeys.size > 0 && !governedKeys.has(key)) {
			problems.push(
				`${POLICY_FILE}: ${key} is no longer a governed environment key — remove the stale entry`,
			);
		}
	}
}

function validateTemplate(policy, parsed, problems) {
	const { entries, malformed } = parsed;
	const placeholder = policy.placeholderPattern
		? new RegExp(policy.placeholderPattern)
		: undefined;

	for (const { lineNumber, line } of malformed) {
		problems.push(
			`${TEMPLATE_FILE}:${lineNumber}: malformed line (not a comment, blank, or KEY=value): ${line}`,
		);
	}

	const seen = new Map();
	for (const entry of entries) {
		if (seen.has(entry.key)) {
			problems.push(
				`${TEMPLATE_FILE}:${entry.lineNumber}: duplicate key ${entry.key} (first at line ${seen.get(entry.key)})`,
			);
			continue;
		}
		seen.set(entry.key, entry.lineNumber);

		if (LEGACY_ENV_ALIASES.has(entry.key)) {
			problems.push(
				`${TEMPLATE_FILE}:${entry.lineNumber}: ${entry.key} is an obsolete alias — use the governed key`,
			);
			continue;
		}

		const descriptor = policy.keys?.[entry.key];
		if (!descriptor) {
			problems.push(
				`${TEMPLATE_FILE}:${entry.lineNumber}: ${entry.key} is not declared in the template policy`,
			);
			continue;
		}

		if (descriptor.requirement === "prohibited") {
			problems.push(
				`${TEMPLATE_FILE}:${entry.lineNumber}: ${entry.key} must not appear in the committed template (${descriptor.reason})`,
			);
		}

		if (
			descriptor.sensitivity === "secret" &&
			entry.value !== "" &&
			!(placeholder?.test(entry.value) ?? false)
		) {
			problems.push(
				`${TEMPLATE_FILE}:${entry.lineNumber}: ${entry.key} is a secret and must be empty or a bracketed placeholder`,
			);
		}
	}

	// Required developer input must be present for the template to be usable.
	for (const [key, descriptor] of Object.entries(policy.keys ?? {})) {
		if (
			descriptor.source === "developer" &&
			descriptor.requirement === "required" &&
			!seen.has(key)
		) {
			problems.push(
				`${TEMPLATE_FILE}: required developer key ${key} is missing from the template`,
			);
		}
	}
}

/**
 * Governed key set from the canonical classification ledger.
 *
 * Returns `undefined` when it cannot be loaded so the caller can *report* that
 * rather than continue with an empty set. Silently degrading to "no governed
 * keys" would turn stale-entry parity off while still printing "ok" — the
 * fail-open this gate exists to prevent.
 */
async function governedKeySet() {
	try {
		const contract = await import("@afenda/env/contract");
		const classification = contract.NEON_ENV_CLASSIFICATION;
		if (!classification || Object.keys(classification).length === 0) {
			return;
		}
		return new Set(Object.keys(classification));
	} catch {
		// Reported by the caller as a hard failure — never degraded to "ok".
	}
}

function argValue(flag) {
	const index = process.argv.indexOf(flag);
	return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
	const root = path.resolve(argValue("--root") ?? repoRoot);
	const templatePath = path.join(root, TEMPLATE_FILE);
	const policyPath = path.join(root, POLICY_FILE);
	const problems = [];

	if (!existsSync(policyPath)) {
		console.error(`check-env-example: FAIL\n  - missing policy ${POLICY_FILE}`);
		process.exit(1);
	}
	if (!existsSync(templatePath)) {
		console.error(
			`check-env-example: FAIL\n  - missing committed template ${TEMPLATE_FILE}`,
		);
		process.exit(1);
	}

	const policy = JSON.parse(readFileSync(policyPath, "utf8"));
	const parsed = parseTemplate(readFileSync(templatePath, "utf8"));

	const governedKeys = await governedKeySet();
	if (governedKeys === undefined) {
		problems.push(
			"cannot load NEON_ENV_CLASSIFICATION from @afenda/env/contract — stale-entry parity cannot run; refusing to report ok",
		);
	}

	validatePolicyShape(policy, governedKeys ?? new Set(), problems);
	validateTemplate(policy, parsed, problems);

	if (problems.length > 0) {
		console.error("check-env-example: FAIL");
		for (const problem of [...new Set(problems)].sort()) {
			console.error(`  - ${problem}`);
		}
		process.exit(1);
	}

	console.log(
		`check-env-example: ok (${parsed.entries.length} template key(s) governed)`,
	);
}

main().catch((error) => {
	console.error(
		`check-env-example FAIL: ${error instanceof Error ? error.message : String(error)}`,
	);
	process.exit(1);
});
