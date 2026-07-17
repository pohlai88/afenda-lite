/**
 * GUIDE-018 I5.5 — in-CI secrets/vars presence probe (no `gh secret list`).
 *
 * Inject required names into the job env from `${{ secrets.* }}` / `${{ vars.* }}`.
 * Empty injection ⇒ fail closed. Never prints values.
 *
 * Usage: node scripts/ci-secrets-presence.mjs
 */

import {
	evaluateGithubActionsSecretsPresenceFromEnv,
	REQUIRED_ACTIONS_SECRETS,
	REQUIRED_ACTIONS_VARS,
} from "./lib/github-actions-secrets-audit.mjs";

function main() {
	console.log("=== CI secrets/vars presence (I5.5) ===\n");
	console.log(`Required secrets: ${REQUIRED_ACTIONS_SECRETS.join(", ")}`);
	console.log(
		"Required secret alternates (one of each group): E2E_FACTORY_PASSWORD|PREVIEW_CLIENT_PASSWORD",
	);
	console.log(`Required vars: ${REQUIRED_ACTIONS_VARS.join(", ")}\n`);

	const result = evaluateGithubActionsSecretsPresenceFromEnv(process.env);

	if (!result.ok) {
		if (result.missingSecrets.length > 0) {
			console.error(
				`[fail] missing secrets (empty injection): ${result.missingSecrets.join(", ")}`,
			);
		}
		if (result.missingSecretAlternates.length > 0) {
			console.error(
				`[fail] missing secret alternates (need one of each group): ${result.missingSecretAlternates.join("; ")}`,
			);
		}
		if (result.missingVars.length > 0) {
			console.error(
				`[fail] missing vars (empty injection): ${result.missingVars.join(", ")}`,
			);
		}
		console.error(
			"\nResult: FAIL — set Actions secret/var names (repo or production env). Owner: Platform. Skip is not PASS.",
		);
		process.exit(1);
	}

	console.log(
		"Result: PASS — all required secret and variable names have non-empty CI injection.",
	);
	process.exit(0);
}

main();
