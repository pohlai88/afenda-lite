import { createSessionProxy } from "@afenda/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { shouldBypassSessionGate } from "./session-gate-policy";

/**
 * GUIDE-018 I1.1 — document-navigation session gate.
 * Matcher + bypasses follow ARCH-012 §3.12; Living `/admin` is included
 * because the operator shell is on disk under that path (ARCH-022).
 * Server Actions / mutations must still call `getSession` / `requireRole`
 * inside the action — proxy alone is not an authz bar.
 */

const runSessionGate = createSessionProxy();

export async function proxy(request: NextRequest) {
	if (
		shouldBypassSessionGate({
			method: request.method,
			pathname: request.nextUrl.pathname,
			searchParams: request.nextUrl.searchParams,
			hasHeader: (name) => request.headers.has(name),
		})
	) {
		return NextResponse.next();
	}

	return runSessionGate(request);
}

export const config = {
	matcher: [
		"/account/:path*",
		"/dashboard/:path*",
		"/admin/:path*",
		"/client/:path*",
		"/fft/:path*",
		"/playground/:path*",
	],
};
