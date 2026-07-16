/**
 * Playwright credential resolution for Neon Auth journeys.
 * Prefer explicit `E2E_*` overrides; fall back to local seed fixtures.
 * Never invent passwords — callers must skip when a pair is incomplete.
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

/** Operator / org-admin shell account. */
export function resolveOperatorCredentials(): E2ECredentialPair | null {
	return (
		readPair("E2E_OPERATOR_EMAIL", "E2E_OPERATOR_PASSWORD") ??
		readPair("SHARED_ADMIN_EMAIL", "SHARED_ADMIN_PASSWORD")
	);
}

/** Client shell account (post-login routing). */
export function resolveClientCredentials(): E2ECredentialPair | null {
	return (
		readPair("E2E_CLIENT_EMAIL", "E2E_CLIENT_PASSWORD") ??
		readPair("PREVIEW_CLIENT_EMAIL", "PREVIEW_CLIENT_PASSWORD")
	);
}

/**
 * Non-member invitee for N8 invite→join accept.
 * Prefer `E2E_INVITEE_*`; else fixture email + `PREVIEW_CLIENT_PASSWORD`
 * (hash aligned by `prepareN8InviteeFixture`).
 */
export function resolveInviteeCredentials(): E2ECredentialPair | null {
	const explicit = readPair("E2E_INVITEE_EMAIL", "E2E_INVITEE_PASSWORD");
	if (explicit) {
		return explicit;
	}
	const password =
		process.env.E2E_INVITEE_PASSWORD?.trim() ||
		process.env.PREVIEW_CLIENT_PASSWORD?.trim() ||
		"";
	const email = process.env.E2E_INVITEE_EMAIL?.trim() || "";
	if (email && password) {
		return { email, password };
	}
	return null;
}
