import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { AUTH_LOGIN_PATH } from "./auth-paths";
import { buildEnsureActiveOrganizationUrl } from "./ensure-active-organization";
import { getNeonAuth } from "./neon-auth";
import { resolveMemberOrganizationId } from "./organization-membership";
import { sanitizeCallbackUrl } from "./post-login";
import type { Role } from "./role";
import { toSessionRole } from "./roles";
import { buildSyncSessionCookiesUrl } from "./sync-session-cookies";

export { getNeonAuth } from "./neon-auth";
export type { Role } from "./role";

/**
 * Typed Afenda session. `orgId` is always present when this value exists —
 * `getSession()` never returns null and never invents a missing org.
 */
export type Session = {
	userId: string;
	orgId: string;
	role: Role;
};

/**
 * Route Handler session — includes normalized email for ownership checks.
 * Returns `null` instead of redirecting (API-002 JSON 401 path).
 */
export type ApiSession = Session & {
	email: string;
};

type SessionResolveFailure =
	| "unauthenticated"
	| "missing_org"
	| "needs_active_org"
	| "needs_cookie_sync"
	| "missing_email"
	| "missing_role";

const COOKIE_MUTATION_BLOCKED =
	"Cookies can only be modified in a Server Action or Route Handler";

function isCookieMutationBlockedError(error: unknown): boolean {
	return (
		error instanceof Error && error.message.includes(COOKIE_MUTATION_BLOCKED)
	);
}

function normalizeSessionEmail(email: unknown): string | null {
	if (typeof email !== "string") {
		return null;
	}
	const normalized = email.trim().toLowerCase();
	return normalized.length > 0 ? normalized : null;
}

async function loadApiSession(): Promise<
	| { ok: true; session: ApiSession }
	| { ok: false; reason: SessionResolveFailure }
> {
	const auth = getNeonAuth();
	let data: Awaited<ReturnType<typeof auth.getSession>>["data"];
	let error: Awaited<ReturnType<typeof auth.getSession>>["error"];
	try {
		({ data, error } = await auth.getSession());
	} catch (caught) {
		// Neon Auth applies upstream Set-Cookie during getSession (session_data
		// mint / token refresh). RSC cannot mutate cookies — bounce to the
		// cookie-safe sync Route Handler instead of 500.
		if (isCookieMutationBlockedError(caught)) {
			return { ok: false, reason: "needs_cookie_sync" };
		}
		throw caught;
	}

	if (error || !data?.user?.id) {
		return { ok: false, reason: "unauthenticated" };
	}

	const orgId = data.session.activeOrganizationId;
	if (typeof orgId !== "string" || orgId.length === 0) {
		// Neon setActive mutates cookies — RSC cannot persist. Route Handler does.
		const resolvableOrgId = await resolveMemberOrganizationId(auth);
		if (resolvableOrgId) {
			return { ok: false, reason: "needs_active_org" };
		}
		return { ok: false, reason: "missing_org" };
	}

	const email = normalizeSessionEmail(data.user.email);
	if (!email) {
		return { ok: false, reason: "missing_email" };
	}

	const { data: memberRole, error: roleError } =
		await auth.organization.getActiveMemberRole({
			query: { organizationId: orgId },
		});

	const neonRole = memberRole?.role;
	if (roleError || typeof neonRole !== "string" || neonRole.length === 0) {
		return { ok: false, reason: "missing_role" };
	}

	let role: Role;
	try {
		role = toSessionRole(neonRole);
	} catch {
		// Unknown Neon membership labels fail closed — never invent a shell role.
		return { ok: false, reason: "missing_role" };
	}

	return {
		ok: true,
		session: {
			userId: data.user.id,
			orgId,
			role,
			email,
		},
	};
}

/** Request-scoped Neon session load shared by `getSession` and `getApiSession`. */
const loadApiSessionCached = cache(loadApiSession);

async function ensureRedirectTarget(): Promise<string | null> {
	const headerStore = await headers();
	return sanitizeCallbackUrl(headerStore.get("x-afenda-pathname"));
}

async function resolveSession(): Promise<Session> {
	const loaded = await loadApiSessionCached();
	if (!loaded.ok) {
		if (loaded.reason === "unauthenticated") {
			redirect(AUTH_LOGIN_PATH);
		}
		if (loaded.reason === "needs_cookie_sync") {
			redirect(buildSyncSessionCookiesUrl(await ensureRedirectTarget()));
		}
		if (loaded.reason === "needs_active_org") {
			redirect(buildEnsureActiveOrganizationUrl(await ensureRedirectTarget()));
		}
		if (loaded.reason === "missing_org") {
			throw new Error(
				"@afenda/auth: active organization missing from session — refuse silent org default",
			);
		}
		if (loaded.reason === "missing_email") {
			throw new Error(
				"@afenda/auth: authenticated user email missing from session",
			);
		}
		throw new Error(
			"@afenda/auth: active organization membership role unresolved",
		);
	}

	return {
		userId: loaded.session.userId,
		orgId: loaded.session.orgId,
		role: loaded.session.role,
	};
}

/**
 * Resolve the authenticated session or redirect to login.
 * Never returns null. Never fabricates `orgId` when the active org is absent.
 * When a sole/allowlisted membership exists but is not yet active, redirects to
 * the cookie-safe ensure Route Handler (N8).
 * Request-scoped dedupe via `React.cache` (RSC Accelint).
 */
export const getSession: () => Promise<Session> = cache(resolveSession);

/**
 * Authenticated session for Route Handlers — `null` when unauthenticated or
 * incomplete (missing org, role, or email). Never redirects.
 * Shares the same request-scoped Neon load as `getSession`.
 *
 * `needs_active_org` is incomplete for API callers — use the ensure Route
 * Handler (or `getAuthBootstrap` on RSC entry) before treating as anonymous.
 */
export async function getApiSession(): Promise<ApiSession | null> {
	const loaded = await loadApiSessionCached();
	return loaded.ok ? loaded.session : null;
}

export type AuthBootstrap =
	| { state: "anonymous" }
	| { state: "ready"; session: ApiSession }
	| { state: "ensure_active_org"; url: string }
	| { state: "sync_cookies"; url: string }
	/** Signed-in but no resolvable org / role / email — never marketing landing. */
	| {
			state: "unresolved_organization";
			reason: "missing_org" | "missing_role" | "missing_email";
	  };

/**
 * RSC bootstrap for public entry surfaces (e.g. signed-in `/`).
 * Distinguishes anonymous vs resolvable-but-inactive org (N8 cookie persist)
 * vs cookie mint/refresh that must run in a Route Handler vs authenticated
 * but incomplete (no membership / role / email) — never collapses those to
 * anonymous marketing.
 */
export async function getAuthBootstrap(
	next?: string | null,
): Promise<AuthBootstrap> {
	const loaded = await loadApiSessionCached();
	if (loaded.ok) {
		return { state: "ready", session: loaded.session };
	}
	if (loaded.reason === "needs_cookie_sync") {
		return {
			state: "sync_cookies",
			url: buildSyncSessionCookiesUrl(next),
		};
	}
	if (loaded.reason === "needs_active_org") {
		return {
			state: "ensure_active_org",
			url: buildEnsureActiveOrganizationUrl(next),
		};
	}
	if (
		loaded.reason === "missing_org" ||
		loaded.reason === "missing_role" ||
		loaded.reason === "missing_email"
	) {
		return { state: "unresolved_organization", reason: loaded.reason };
	}
	return { state: "anonymous" };
}
