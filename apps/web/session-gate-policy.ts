/**
 * Pure session-gate policy for `apps/web/proxy.ts` (ARCH-012 §3.12).
 * Kept free of Neon Auth so unit tests do not need env/SDK.
 */

import { CLIENT_GATE_PATHS } from "./features/auth/client-paths";

/** Alias of `CLIENT_GATE_PATHS` for proxy/tests (ARCH-012 bypass list). */
export const CLIENT_PUBLIC_PREFIXES = CLIENT_GATE_PATHS;

export type SessionGateRequest = {
	method: string;
	pathname: string;
	searchParams: Pick<URLSearchParams, "get">;
	hasHeader: (name: string) => boolean;
};

function isClientPublicPath(pathname: string): boolean {
	return CLIENT_GATE_PATHS.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
	);
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

	if (isClientPublicPath(request.pathname)) {
		return true;
	}

	return false;
}
