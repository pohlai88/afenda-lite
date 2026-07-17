/**
 * GUIDE-018 I5.5 — main branch protection contract (verify / apply payload).
 * Check contexts must match GitHub Actions job `name` values in ci.yml.
 */

/** @type {readonly string[]} */
export const REQUIRED_MAIN_STATUS_CHECKS = Object.freeze(["quality"]);

/**
 * Living protection policy for `main` (PR merge gate honesty).
 * Main-only jobs (`tenancy-nulls`, `e2e-smoke`, `secrets-presence`) are enforced
 * by CI workflow completion + Deploy `workflow_run`, not as PR required checks.
 */
export const MAIN_PROTECTION_POLICY = Object.freeze({
	required_status_checks: Object.freeze({
		strict: true,
		contexts: REQUIRED_MAIN_STATUS_CHECKS,
	}),
	enforce_admins: false,
	required_pull_request_reviews: null,
	restrictions: null,
	required_linear_history: false,
	allow_force_pushes: false,
	allow_deletions: false,
	block_creations: false,
	required_conversation_resolution: false,
	lock_branch: false,
	allow_fork_syncing: false,
});

/**
 * @param {unknown} protection
 * @returns {{ contexts: string[], strict: boolean, allowForcePushes: boolean, allowDeletions: boolean }}
 */
export function readProtectionSnapshot(protection) {
	if (!protection || typeof protection !== "object") {
		throw new Error("branch protection response must be an object");
	}
	const body = /** @type {Record<string, unknown>} */ (protection);
	const rsc = body.required_status_checks;
	let contexts = [];
	let strict = false;
	if (rsc && typeof rsc === "object") {
		const checks = /** @type {Record<string, unknown>} */ (rsc);
		strict = checks.strict === true;
		if (Array.isArray(checks.contexts)) {
			contexts = checks.contexts.filter((c) => typeof c === "string");
		} else if (Array.isArray(checks.checks)) {
			contexts = checks.checks
				.map((row) =>
					row && typeof row === "object"
						? /** @type {Record<string, unknown>} */ (row).context
						: undefined,
				)
				.filter((c) => typeof c === "string");
		}
	}
	const allowForce =
		body.allow_force_pushes && typeof body.allow_force_pushes === "object"
			? /** @type {Record<string, unknown>} */ (body.allow_force_pushes)
					.enabled === true
			: body.allow_force_pushes === true;
	const allowDel =
		body.allow_deletions && typeof body.allow_deletions === "object"
			? /** @type {Record<string, unknown>} */ (body.allow_deletions)
					.enabled === true
			: body.allow_deletions === true;
	return {
		contexts: [...contexts].sort(),
		strict,
		allowForcePushes: allowForce,
		allowDeletions: allowDel,
	};
}

/**
 * @param {unknown} protection
 * @param {{ requiredContexts?: readonly string[] }} [opts]
 */
export function evaluateMainProtection(protection, opts = {}) {
	const required = [
		...(opts.requiredContexts ?? REQUIRED_MAIN_STATUS_CHECKS),
	].sort();
	const snap = readProtectionSnapshot(protection);
	const missingContexts = required.filter((c) => !snap.contexts.includes(c));
	const staleContexts = snap.contexts.filter((c) => !required.includes(c));
	const ok =
		missingContexts.length === 0 &&
		staleContexts.length === 0 &&
		snap.strict === true &&
		snap.allowForcePushes === false &&
		snap.allowDeletions === false;
	return {
		ok,
		missingContexts,
		staleContexts,
		strict: snap.strict,
		allowForcePushes: snap.allowForcePushes,
		allowDeletions: snap.allowDeletions,
		observedContexts: snap.contexts,
		requiredContexts: required,
	};
}

/**
 * PUT body for GitHub branch protection API.
 * @returns {Record<string, unknown>}
 */
export function buildMainProtectionPutBody() {
	return {
		required_status_checks: {
			strict: MAIN_PROTECTION_POLICY.required_status_checks.strict,
			contexts: [...MAIN_PROTECTION_POLICY.required_status_checks.contexts],
		},
		enforce_admins: MAIN_PROTECTION_POLICY.enforce_admins,
		required_pull_request_reviews:
			MAIN_PROTECTION_POLICY.required_pull_request_reviews,
		restrictions: MAIN_PROTECTION_POLICY.restrictions,
		required_linear_history: MAIN_PROTECTION_POLICY.required_linear_history,
		allow_force_pushes: MAIN_PROTECTION_POLICY.allow_force_pushes,
		allow_deletions: MAIN_PROTECTION_POLICY.allow_deletions,
		block_creations: MAIN_PROTECTION_POLICY.block_creations,
		required_conversation_resolution:
			MAIN_PROTECTION_POLICY.required_conversation_resolution,
		lock_branch: MAIN_PROTECTION_POLICY.lock_branch,
		allow_fork_syncing: MAIN_PROTECTION_POLICY.allow_fork_syncing,
	};
}
