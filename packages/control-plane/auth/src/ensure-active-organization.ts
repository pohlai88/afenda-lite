import { NextResponse } from "next/server";

import { authPlainTextFailure } from "./auth-failure";
import { AUTH_LOGIN_PATH } from "./auth-paths";
import { getNeonAuth } from "./neon-auth";
import {
	persistActiveOrganization,
	resolveMemberOrganizationId,
} from "./organization-membership";
import { resolvePostLoginPath, sanitizeCallbackUrl } from "./post-login";
import { toSessionRole } from "./roles";

/**
 * Cookie-safe active-org persistence (N8).
 * Neon `organization.setActive` mutates session cookies — Next.js allows that
 * only in Route Handlers / Server Actions, not RSC `getSession` / `getApiSession`.
 */
export const ENSURE_ACTIVE_ORGANIZATION_PATH =
	"/api/session/ensure-active-organization" as const;

const ENSURE_NEXT_PARAM = "next" as const;

function normalizeSessionEmail(email: unknown): string | null {
	if (typeof email !== "string") {
		return null;
	}
	const normalized = email.trim().toLowerCase();
	return normalized.length > 0 ? normalized : null;
}

/** Build the ensure Route Handler URL with an optional same-origin return path. */
export function buildEnsureActiveOrganizationUrl(next?: string | null): string {
	const safeNext = sanitizeCallbackUrl(next);
	if (!safeNext) {
		return ENSURE_ACTIVE_ORGANIZATION_PATH;
	}
	const params = new URLSearchParams({ [ENSURE_NEXT_PARAM]: safeNext });
	return `${ENSURE_ACTIVE_ORGANIZATION_PATH}?${params.toString()}`;
}

/**
 * GET handler body for `ENSURE_ACTIVE_ORGANIZATION_PATH`.
 * Resolves sole/allowlisted membership, persists active org, then redirects.
 */
export async function handleEnsureActiveOrganizationRequest(
	request: Request,
): Promise<Response> {
	const requestUrl = new URL(request.url);
	const next = sanitizeCallbackUrl(
		requestUrl.searchParams.get(ENSURE_NEXT_PARAM),
	);
	const auth = getNeonAuth();

	// Bypass signed session_data cookie — inbound headers often still carry a
	// pre-setActive payload (null activeOrganizationId) while the Auth server
	// already has the org. Cookie-cache hits here cause ensure↔`/` loops.
	const { data, error } = await auth.getSession({
		query: { disableCookieCache: "true" },
	});

	if (error || !data?.user?.id) {
		return NextResponse.redirect(new URL(AUTH_LOGIN_PATH, requestUrl.origin));
	}

	let orgId = data.session.activeOrganizationId;
	if (typeof orgId !== "string" || orgId.length === 0) {
		const organizationId = await resolveMemberOrganizationId(auth);
		if (!organizationId) {
			return authPlainTextFailure(
				"FORBIDDEN",
				"@afenda/auth: no resolvable member organization for active session",
			);
		}

		const persisted = await persistActiveOrganization(auth, organizationId);
		if (!persisted) {
			return authPlainTextFailure(
				"INTERNAL_ERROR",
				"@afenda/auth: failed to persist active organization on session",
			);
		}

		// Trust persist — do not re-read via cookie-cache getSession (stale
		// inbound session_data). Upstream mint below refreshes cookies.
		orgId = organizationId;
	}

	const email = normalizeSessionEmail(data.user.email);
	if (!email) {
		return authPlainTextFailure(
			"INTERNAL_ERROR",
			"@afenda/auth: authenticated user email missing from session",
		);
	}

	const { data: memberRole, error: roleError } =
		await auth.organization.getActiveMemberRole({
			query: { organizationId: orgId },
		});
	const neonRole = memberRole?.role;
	if (roleError || typeof neonRole !== "string" || neonRole.length === 0) {
		return authPlainTextFailure(
			"INTERNAL_ERROR",
			"@afenda/auth: active organization membership role unresolved",
		);
	}

	let role: ReturnType<typeof toSessionRole>;
	try {
		role = toSessionRole(neonRole);
	} catch {
		return authPlainTextFailure(
			"INTERNAL_ERROR",
			"@afenda/auth: active organization membership role unresolved",
		);
	}

	// Mint / refresh session_data on this response so the next RSC navigation
	// does not keep reading a stale null activeOrganizationId from cookies.
	await auth.getSession({
		query: { disableCookieCache: "true" },
	});

	return NextResponse.redirect(
		new URL(next ?? resolvePostLoginPath({ role }), requestUrl.origin),
	);
}
