import { createSessionProxy } from "@afenda/auth";
import { env } from "@afenda/env";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
	CORRELATION_HEADER,
	resolveCorrelationId,
} from "@/modules/platform/observability/correlation";
import { logProductEvent } from "@/modules/platform/observability/product-log";

import { shouldBypassSessionGate } from "./session-gate-policy";

/**
 * GUIDE-018 I1.1 — document-navigation session gate.
 * Matcher + bypasses follow ARCH-012 §3.12; Living `/admin` is included
 * because the operator shell is on disk under that path (ARCH-022).
 * Server Actions / mutations must still call `getSession` / `requireRole`
 * inside the action — proxy alone is not an authz bar.
 * I5.3 / API-007 — stamps `x-correlation-id` on gate responses.
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

function withCorrelation(
	response: NextResponse,
	correlationId: string,
): NextResponse {
	response.headers.set(CORRELATION_HEADER, correlationId);
	return response;
}

export async function proxy(request: NextRequest) {
	const correlationId = resolveCorrelationId(
		request.headers.get(CORRELATION_HEADER),
	);

	if (
		shouldBypassSessionGate({
			method: request.method,
			pathname: request.nextUrl.pathname,
			searchParams: request.nextUrl.searchParams,
			hasHeader: (name) => request.headers.has(name),
			playgroundEnabled: env.PLAYGROUND_ENABLED,
		})
	) {
		return withCorrelation(
			NextResponse.next({
				request: { headers: withPathnameHeader(request) },
			}),
			correlationId,
		);
	}

	const gateResponse = await runSessionGate(request);
	if (gateResponse.status >= 300 && gateResponse.status < 400) {
		logProductEvent({
			level: "info",
			event: "proxy.session_redirect",
			correlationId,
			path: request.nextUrl.pathname,
		});
		gateResponse.headers.set(CORRELATION_HEADER, correlationId);
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
	return withCorrelation(response, correlationId);
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
