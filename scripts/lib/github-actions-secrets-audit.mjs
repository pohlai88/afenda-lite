/**
 * Presence-only GitHub Actions secrets/vars audit helpers (N12).
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
 * @param {{
 *   secretNames: Iterable<string>,
 *   varNames: Iterable<string>,
 *   requiredSecrets?: readonly string[],
 *   requiredVars?: readonly string[],
 * }} input
 */
export function evaluateGithubActionsSecretsAudit(input) {
	const requiredSecrets = input.requiredSecrets ?? REQUIRED_ACTIONS_SECRETS;
	const requiredVars = input.requiredVars ?? REQUIRED_ACTIONS_VARS;
	const missingSecrets = missingRequiredNames(
		input.secretNames,
		requiredSecrets,
	);
	const missingVars = missingRequiredNames(input.varNames, requiredVars);
	return {
		ok: missingSecrets.length === 0 && missingVars.length === 0,
		missingSecrets,
		missingVars,
		requiredSecrets: [...requiredSecrets],
		requiredVars: [...requiredVars],
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
