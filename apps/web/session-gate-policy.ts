/**
 * Pure session-gate policy for `apps/web/proxy.ts` (ARCH-012 §3.12 · PL-S5).
 * Kept free of Neon Auth so unit tests do not need env/SDK.
 *
 * Document-navigation gate only. Structured unauthorized for Route Handlers
 * stays with `getApiSession` (API-002 JSON 401) — never HTML login redirects.
 */

import { AUTH_API_BASE_PATH } from "@afenda/auth/client";

import { CLIENT_GATE_PATHS } from "./features/auth/client-paths";
import { PRE_LOGIN_API_PATHS } from "./features/auth/pre-login-route-contract";

export type SessionGateRequest = {
	method: string;
	pathname: string;
	searchParams: Pick<URLSearchParams, "get">;
	hasHeader: (name: string) => boolean;
	/** When true, `/playground/*` may bypass the session gate (local harness). */
	playgroundEnabled?: boolean;
};

function isClientPublicPath(pathname: string): boolean {
	return CLIENT_GATE_PATHS.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
	);
}

/** Local AdminCN harness — layout enforces `PLAYGROUND_ENABLED` via notFound. */
function isPlaygroundPath(pathname: string): boolean {
	return pathname === "/playground" || pathname.startsWith("/playground/");
}

/**
 * Pre-Login API class from `PRE_LOGIN_API_PATHS` — auth BFF is a prefix;
 * health probes are exact. Defense-in-depth if the matcher is widened;
 * post-login `/api/*` surfaces are intentionally not listed.
 */
function isPreLoginApiPath(pathname: string): boolean {
	for (const apiPath of PRE_LOGIN_API_PATHS) {
		if (apiPath === AUTH_API_BASE_PATH) {
			if (pathname === apiPath || pathname.startsWith(`${apiPath}/`)) {
				return true;
			}
			continue;
		}
		if (pathname === apiPath) {
			return true;
		}
	}
	return false;
}

/**
 * Document-navigation gate only.
 * Server Actions (POST + `next-action`) re-auth inside the action body.
 * GET with a forged `next-action` header must still hit the session gate.
 */
export function shouldBypassSessionGate(request: SessionGateRequest): boolean {
	const method = request.method.toUpperCase();

	if (method === "POST" && request.hasHeader("next-action")) {
		return true;
	}

	if (request.searchParams.get("embed") === "1") {
		return true;
	}

	if (isPreLoginApiPath(request.pathname)) {
		return true;
	}

	if (isClientPublicPath(request.pathname)) {
		return true;
	}

	if (request.playgroundEnabled && isPlaygroundPath(request.pathname)) {
		return true;
	}

	return false;
}
