import type { Role } from "./role";

/**
 * Governed post-login routing (N7).
 *
 * One SSOT for: coarse role → authorized product home, and the same-origin
 * callback allowlist. Pure module — no `server-only`, no request context — so
 * both the server barrel (`@afenda/auth`) and the client barrel
 * (`@afenda/auth/client`) can consume it.
 *
 * Role home is coarse routing only (ARCH-026). It never replaces ARCH-023
 * Tier-2 permission checks: `requireRole` / `hasPermission` still gate shells.
 */

/** Operator + admin coarse product home (operator shell). */
export const OPERATOR_HOME_PATH = "/admin" as const;

/** Client coarse product home (workspace empty state — no domain modules). */
export const CLIENT_HOME_PATH = "/client" as const;

/**
 * Query-param name that carries the intended post-login return path.
 * Matches the Neon Auth UI / better-auth-ui `redirectTo` convention so a deep
 * link preserved on the login URL is honored after authentication.
 */
export const POST_LOGIN_CALLBACK_PARAM = "redirectTo" as const;

/** Fixed base used only to normalize + origin-check candidate callback paths. */
const CALLBACK_ALLOWLIST_ORIGIN = "http://afenda.invalid";

/** Whitespace and backslashes never belong in a safe callback path. */
const UNSAFE_CALLBACK_CHARACTERS = /[\s\\]/;

/** Reject C0 control characters and DEL without embedding them in a regex. */
function hasControlCharacter(value: string): boolean {
	for (let index = 0; index < value.length; index += 1) {
		const code = value.charCodeAt(index);
		if (code <= 31 || code === 127) {
			return true;
		}
	}
	return false;
}

/**
 * Resolve the authorized coarse product home for a session role.
 * `admin` and `operator` share the operator shell; `client` is exclusive.
 */
export function resolveRoleHome(role: Role): string {
	switch (role) {
		case "admin":
		case "operator":
			return OPERATOR_HOME_PATH;
		case "client":
			return CLIENT_HOME_PATH;
		default: {
			const _exhaustive: never = role;
			throw new Error(`@afenda/auth: unhandled role home: ${_exhaustive}`);
		}
	}
}

/**
 * Same-origin callback allowlist. Returns a safe in-app path or `null`.
 *
 * Accepts only absolute in-app paths (`/foo`). Rejects (→ `null`):
 * - non-string / empty input
 * - protocol-relative (`//host`) and backslash host tricks (`/\host`)
 * - absolute URLs / scheme prefixes (`https:`, `javascript:`, `data:`, …)
 * - control characters, raw whitespace, and backslashes
 * - anything that resolves to a different origin
 *
 * Fail-closed: any parse ambiguity returns `null` (caller falls back to the
 * role home), so an attacker-controlled value can never drive a redirect.
 */
export function sanitizeCallbackUrl(raw: unknown): string | null {
	if (typeof raw !== "string") {
		return null;
	}
	const value = raw.trim();
	if (value.length === 0) {
		return null;
	}
	if (!value.startsWith("/")) {
		return null;
	}
	if (value.startsWith("//")) {
		return null;
	}
	if (UNSAFE_CALLBACK_CHARACTERS.test(value) || hasControlCharacter(value)) {
		return null;
	}

	let resolved: URL;
	try {
		resolved = new URL(value, CALLBACK_ALLOWLIST_ORIGIN);
	} catch {
		return null;
	}
	if (resolved.origin !== CALLBACK_ALLOWLIST_ORIGIN) {
		return null;
	}

	const normalized = `${resolved.pathname}${resolved.search}${resolved.hash}`;
	return normalized.startsWith("/") ? normalized : null;
}

/** Post-login destination inputs — coarse role plus an optional raw callback. */
export type PostLoginTarget = {
	role: Role;
	callbackUrl?: unknown;
};

/**
 * Resolve the single post-login destination.
 * A safe same-origin callback wins; otherwise the role home.
 *
 * The callback is intentionally not role-filtered here: an authorized deep link
 * lands and a wrong-role deep link still hits `requireRole` → `/403`.
 */
export function resolvePostLoginPath({
	role,
	callbackUrl,
}: PostLoginTarget): string {
	return sanitizeCallbackUrl(callbackUrl) ?? resolveRoleHome(role);
}
