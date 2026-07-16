import type { NextRequest, NextResponse } from "next/server";

import { AUTH_LOGIN_PATH } from "./auth-paths";
import { getNeonAuth } from "./neon-auth";
import { POST_LOGIN_CALLBACK_PARAM, sanitizeCallbackUrl } from "./post-login";

export { AUTH_LOGIN_PATH };

export type SessionProxy = (
	request: NextRequest,
) => Promise<NextResponse<unknown>>;

/**
 * Neon Auth session gate for Next.js `apps/web/proxy.ts` (Node runtime).
 * Keeps `@neondatabase/auth` usage inside `@afenda/auth` (ARCH-026).
 *
 * When Neon redirects unauthenticated visitors to login, preserve the original
 * same-origin path as `redirectTo` so post-login (and N8 ensure) can restore it.
 */
export function createSessionProxy(): SessionProxy {
	const neonGate = getNeonAuth().middleware({ loginUrl: AUTH_LOGIN_PATH });

	return async (request) => {
		const response = await neonGate(request);
		if (response.status < 300 || response.status >= 400) {
			return response;
		}

		const location = response.headers.get("location");
		if (!location) {
			return response;
		}

		let loginUrl: URL;
		try {
			loginUrl = new URL(location, request.nextUrl.origin);
		} catch {
			return response;
		}

		if (loginUrl.pathname !== AUTH_LOGIN_PATH) {
			return response;
		}

		const returnPath = sanitizeCallbackUrl(
			`${request.nextUrl.pathname}${request.nextUrl.search}`,
		);
		if (!returnPath || returnPath === AUTH_LOGIN_PATH) {
			return response;
		}

		loginUrl.searchParams.set(POST_LOGIN_CALLBACK_PARAM, returnPath);
		response.headers.set("location", loginUrl.toString());
		return response;
	};
}
