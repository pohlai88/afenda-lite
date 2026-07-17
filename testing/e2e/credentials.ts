/**
 * Playwright credential resolution for Neon Auth journeys.
 *
 * N13 factory SSOT: `workerTenant` from `@/testing/e2e/playwright-base` +
 * `E2E_FACTORY_PASSWORD`. Explicit `E2E_*` pairs support one-off runs.
 * Seed autofill accounts are never Playwright login subjects. Callers skip
 * with a named reason when neither factory nor explicit credentials exist.
 */

export type E2ECredentialPair = {
	email: string;
	password: string;
};

function readPair(
	emailKey: string,
	passwordKey: string,
): E2ECredentialPair | null {
	const email = process.env[emailKey]?.trim();
	const password = process.env[passwordKey]?.trim();
	if (!email || !password) {
		return null;
	}
	return { email, password };
}

/** Explicit operator / org-admin shell account for one-off runs. */
export function resolveOperatorCredentials(): E2ECredentialPair | null {
	return readPair("E2E_OPERATOR_EMAIL", "E2E_OPERATOR_PASSWORD");
}

/** Explicit client shell account for one-off runs. */
export function resolveClientCredentials(): E2ECredentialPair | null {
	return readPair("E2E_CLIENT_EMAIL", "E2E_CLIENT_PASSWORD");
}

/** Explicit non-member invitee for one-off invite→join runs. */
export function resolveInviteeCredentials(): E2ECredentialPair | null {
	return readPair("E2E_INVITEE_EMAIL", "E2E_INVITEE_PASSWORD");
}
