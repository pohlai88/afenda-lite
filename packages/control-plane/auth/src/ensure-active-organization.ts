import { errorResult } from "@afenda/errors";
import { NextResponse } from "next/server";

import { authPlainTextFailure } from "./auth-failure";
import { AUTH_LOGIN_PATH } from "./auth-paths";
import { getNeonAuth } from "./neon-auth";
import { normalizeNeonEmail } from "./neon-normalization";
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
			return authPlainTextFailure(errorResult.fail("FORBIDDEN"));
		}

		const persisted = await persistActiveOrganization(auth, organizationId);
		if (!persisted) {
			return authPlainTextFailure(errorResult.fail("INTERNAL_ERROR"));
		}

		// Trust persist — do not re-read via cookie-cache getSession (stale
		// inbound session_data). Upstream mint below refreshes cookies.
		orgId = organizationId;
	}

	const email = normalizeNeonEmail(data.user.email);
	if (!email) {
		return authPlainTextFailure(errorResult.fail("INTERNAL_ERROR"));
	}

	const { data: memberRole, error: roleError } =
		await auth.organization.getActiveMemberRole({
			query: { organizationId: orgId },
		});
	const neonRole = memberRole?.role;
	if (roleError || typeof neonRole !== "string" || neonRole.length === 0) {
		return authPlainTextFailure(errorResult.fail("INTERNAL_ERROR"));
	}

	let role: ReturnType<typeof toSessionRole>;
	try {
		role = toSessionRole(neonRole);
	} catch {
		return authPlainTextFailure(errorResult.fail("INTERNAL_ERROR"));
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
