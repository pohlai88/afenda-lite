import { createSessionProxy } from "@afenda/auth";
import { env } from "@afenda/env";
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

const AFENDA_PATHNAME_HEADER = "x-afenda-pathname";

function withPathnameHeader(request: NextRequest): Headers {
	const requestHeaders = new Headers(request.headers);
	requestHeaders.set(
		AFENDA_PATHNAME_HEADER,
		`${request.nextUrl.pathname}${request.nextUrl.search}`,
	);
	return requestHeaders;
}

export async function proxy(request: NextRequest) {
	if (
		shouldBypassSessionGate({
			method: request.method,
			pathname: request.nextUrl.pathname,
			searchParams: request.nextUrl.searchParams,
			hasHeader: (name) => request.headers.has(name),
			playgroundEnabled: env.PLAYGROUND_ENABLED,
		})
	) {
		return NextResponse.next({
			request: { headers: withPathnameHeader(request) },
		});
	}

	const gateResponse = await runSessionGate(request);
	if (gateResponse.status >= 300 && gateResponse.status < 400) {
		return gateResponse;
	}

	// Authenticated continue — stamp pathname so N8 ensure can restore deep links.
	const response = NextResponse.next({
		request: { headers: withPathnameHeader(request) },
	});
	gateResponse.headers.forEach((value, key) => {
		if (key.toLowerCase() === "set-cookie") {
			response.headers.append(key, value);
		} else {
			response.headers.set(key, value);
		}
	});
	return response;
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
