/**
 * Presence-only GitHub Actions secrets/vars audit helpers (N12 / I5.5).
 * Never handles or prints secret values — names only.
 */

/** @type {readonly string[]} */
export const REQUIRED_ACTIONS_SECRETS = Object.freeze([
	"VERCEL_TOKEN",
	"DATABASE_URL",
	"NEON_AUTH_BASE_URL",
	"NEON_AUTH_COOKIE_SECRET",
	"APP_URL",
	"TURBO_TOKEN",
]);

/**
 * Standing e2e-smoke accepts either name (ci.yml OR-expression).
 * Audit fails closed only when both are absent.
 * @type {readonly (readonly string[])[]}
 */
export const REQUIRED_SECRET_ALTERNATE_GROUPS = Object.freeze([
	Object.freeze(["E2E_FACTORY_PASSWORD", "PREVIEW_CLIENT_PASSWORD"]),
]);

/** @type {readonly string[]} */
export const REQUIRED_ACTIONS_VARS = Object.freeze([
	"VERCEL_ORG_ID",
	"VERCEL_PROJECT_ID",
	"TURBO_TEAM",
]);

/**
 * Parse `gh secret list --json name` / `gh variable list --json name` stdout.
 * @param {string} jsonText
 * @returns {string[]}
 */
export function parseGhNameListJson(jsonText) {
	const trimmed = jsonText.trim();
	if (trimmed.length === 0) {
		return [];
	}
	const parsed = JSON.parse(trimmed);
	if (!Array.isArray(parsed)) {
		throw new Error("gh JSON list must be an array");
	}
	const names = [];
	for (const row of parsed) {
		if (row && typeof row.name === "string" && row.name.trim().length > 0) {
			names.push(row.name.trim());
		}
	}
	return names;
}

/**
 * @param {Iterable<string>} present
 * @param {readonly string[]} required
 * @returns {string[]}
 */
export function missingRequiredNames(present, required) {
	const set = new Set(
		[...present].map((n) => n.trim()).filter((n) => n.length > 0),
	);
	return required.filter((name) => !set.has(name));
}

/**
 * @param {Iterable<string>} present
 * @param {readonly (readonly string[])[]} groups
 * @returns {string[]}
 */
export function missingAlternateGroups(present, groups) {
	const set = new Set(
		[...present].map((n) => n.trim()).filter((n) => n.length > 0),
	);
	const missing = [];
	for (const group of groups) {
		const hit = group.some((name) => set.has(name));
		if (!hit) {
			missing.push(group.join("|"));
		}
	}
	return missing;
}

/**
 * @param {{
 *   secretNames: Iterable<string>,
 *   varNames: Iterable<string>,
 *   requiredSecrets?: readonly string[],
 *   requiredVars?: readonly string[],
 *   requiredSecretAlternateGroups?: readonly (readonly string[])[],
 * }} input
 */
export function evaluateGithubActionsSecretsAudit(input) {
	const requiredSecrets = input.requiredSecrets ?? REQUIRED_ACTIONS_SECRETS;
	const requiredVars = input.requiredVars ?? REQUIRED_ACTIONS_VARS;
	const alternateGroups =
		input.requiredSecretAlternateGroups ?? REQUIRED_SECRET_ALTERNATE_GROUPS;
	const missingSecrets = missingRequiredNames(
		input.secretNames,
		requiredSecrets,
	);
	const missingSecretAlternates = missingAlternateGroups(
		input.secretNames,
		alternateGroups,
	);
	const missingVars = missingRequiredNames(input.varNames, requiredVars);
	return {
		ok:
			missingSecrets.length === 0 &&
			missingSecretAlternates.length === 0 &&
			missingVars.length === 0,
		missingSecrets,
		missingSecretAlternates,
		missingVars,
		requiredSecrets: [...requiredSecrets],
		requiredVars: [...requiredVars],
		requiredSecretAlternateGroups: alternateGroups.map((g) => [...g]),
	};
}

/**
 * In-CI presence probe: treat non-empty env values as "present" for required
 * names. Never prints values. Compensates for Actions GITHUB_TOKEN inability
 * to `gh secret list` — Ops name-list audit remains `pnpm audit:github-actions-secrets`.
 *
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} env
 * @param {{
 *   requiredSecrets?: readonly string[],
 *   requiredVars?: readonly string[],
 *   requiredSecretAlternateGroups?: readonly (readonly string[])[],
 * }} [opts]
 */
export function evaluateGithubActionsSecretsPresenceFromEnv(env, opts = {}) {
	const requiredSecrets = opts.requiredSecrets ?? REQUIRED_ACTIONS_SECRETS;
	const requiredVars = opts.requiredVars ?? REQUIRED_ACTIONS_VARS;
	const alternateGroups =
		opts.requiredSecretAlternateGroups ?? REQUIRED_SECRET_ALTERNATE_GROUPS;

	/** @param {string} name */
	const present = (name) => {
		const value = env[name];
		return typeof value === "string" && value.trim().length > 0;
	};

	const missingSecrets = requiredSecrets.filter((name) => !present(name));
	const missingVars = requiredVars.filter((name) => !present(name));
	const missingSecretAlternates = [];
	for (const group of alternateGroups) {
		if (!group.some((name) => present(name))) {
			missingSecretAlternates.push(group.join("|"));
		}
	}

	return {
		ok:
			missingSecrets.length === 0 &&
			missingSecretAlternates.length === 0 &&
			missingVars.length === 0,
		missingSecrets,
		missingSecretAlternates,
		missingVars,
		requiredSecrets: [...requiredSecrets],
		requiredVars: [...requiredVars],
		requiredSecretAlternateGroups: alternateGroups.map((g) => [...g]),
	};
}

/**
 * Strip common secret-like substrings from diagnostic text (defense in depth).
 * @param {string} text
 */
export function sanitizeAuditOutput(text) {
	return text
		.replace(/postgres:\/\/[^\s"']+/gi, "postgres://[redacted]")
		.replace(
			/(cookie[_-]?secret|password|token)\s*[:=]\s*\S+/gi,
			"$1=[redacted]",
		);
}
