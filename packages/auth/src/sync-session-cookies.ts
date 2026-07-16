import { NextResponse } from "next/server";

import { AUTH_LOGIN_PATH } from "./auth-paths";
import { getNeonAuth } from "./neon-auth";
import { sanitizeCallbackUrl } from "./post-login";

/**
 * Cookie-capable session mint / refresh (N8 companion).
 * Neon Auth `getSession` may return Set-Cookie (session_data mint / token
 * refresh). Next.js only allows that in Route Handlers / Server Actions —
 * never in RSC. When RSC hits that path, bounce here then continue.
 */
export const SYNC_SESSION_COOKIES_PATH = "/api/session/sync-cookies" as const;

const SYNC_NEXT_PARAM = "next" as const;

/** Build the sync Route Handler URL with an optional same-origin return path. */
export function buildSyncSessionCookiesUrl(next?: string | null): string {
	const safeNext = sanitizeCallbackUrl(next);
	if (!safeNext) {
		return SYNC_SESSION_COOKIES_PATH;
	}
	const params = new URLSearchParams({ [SYNC_NEXT_PARAM]: safeNext });
	return `${SYNC_SESSION_COOKIES_PATH}?${params.toString()}`;
}

/**
 * GET handler body for `SYNC_SESSION_COOKIES_PATH`.
 * Forces an upstream session load so Set-Cookie can apply, then redirects.
 */
export async function handleSyncSessionCookiesRequest(
	request: Request,
): Promise<Response> {
	const requestUrl = new URL(request.url);
	const next =
		sanitizeCallbackUrl(requestUrl.searchParams.get(SYNC_NEXT_PARAM)) ?? "/";
	const auth = getNeonAuth();

	// Bypass signed session_data cookie so mint/refresh Set-Cookie is applied
	// on this Route Handler response (RSC cannot do that).
	const { data, error } = await auth.getSession({
		query: { disableCookieCache: "true" },
	});

	if (error || !data?.user?.id) {
		return NextResponse.redirect(new URL(AUTH_LOGIN_PATH, requestUrl.origin));
	}

	return NextResponse.redirect(new URL(next, requestUrl.origin));
}
