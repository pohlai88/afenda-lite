import { env } from "@afenda/env";

import { getNeonAuth } from "./neon-auth";

/** Wire header for BFF correlation (API-007 twin — package-local, no apps/web import). */
export const AUTH_BFF_CORRELATION_HEADER = "x-correlation-id" as const;

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AuthRouteHandler = (
	request: Request,
	context: unknown,
) => Response | Promise<Response>;

/** Next.js App Router GET/POST handlers for `/api/auth/[...path]`. */
export type AuthApiHandlers = {
	GET: AuthRouteHandler;
	POST: AuthRouteHandler;
};

/**
 * Prefer a valid inbound correlation id; otherwise mint a new UUID.
 */
export function resolveAuthBffCorrelationId(
	inbound: string | null | undefined,
): string {
	const trimmed = inbound?.trim();
	if (trimmed && UUID_RE.test(trimmed)) {
		return trimmed;
	}
	return crypto.randomUUID();
}

/**
 * Redact secrets and credential headers for BFF log / test surfaces.
 * Never log raw Authorization, Cookie, Set-Cookie, or secret/token-named values.
 */
export function redactAuthHeaderValue(name: string, value: string): string {
	const lower = name.toLowerCase();
	if (
		lower === "authorization" ||
		lower === "cookie" ||
		lower === "set-cookie" ||
		lower.includes("secret") ||
		lower.includes("token")
	) {
		return "[redacted]";
	}
	return value;
}

function firstHeaderValue(value: string | null): string | undefined {
	if (!value) {
		return undefined;
	}
	const first = value.split(",")[0]?.trim();
	return first && first.length > 0 ? first : undefined;
}

/**
 * POST Origin/Host allowlist against `APP_URL` (same-origin browser + trusted proxy host).
 * GET remains provider-pass-through (callbacks / session reads).
 */
export function isTrustedAuthBffPost(request: Request): boolean {
	const appUrl = new URL(env.APP_URL);
	const appOrigin = appUrl.origin;
	const appHost = appUrl.host.toLowerCase();

	const origin = firstHeaderValue(request.headers.get("origin"));
	if (origin) {
		try {
			return new URL(origin).origin === appOrigin;
		} catch {
			return false;
		}
	}

	const host = firstHeaderValue(
		request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
	);
	return host?.toLowerCase() === appHost;
}

function stampCorrelation(response: Response, correlationId: string): Response {
	response.headers.set(AUTH_BFF_CORRELATION_HEADER, correlationId);
	return response;
}

function forbiddenResponse(correlationId: string): Response {
	return stampCorrelation(new Response(null, { status: 403 }), correlationId);
}

function safeInternalErrorResponse(correlationId: string): Response {
	return stampCorrelation(new Response(null, { status: 500 }), correlationId);
}

function logAuthBffUnexpectedError(input: {
	correlationId: string;
	method: string;
	pathname: string;
}): void {
	const line = JSON.stringify({
		ts: new Date().toISOString(),
		service: "afenda-auth-bff",
		level: "error",
		event: "auth_bff.unexpected_error",
		correlationId: input.correlationId,
		method: input.method,
		path: input.pathname,
	});
	console.error(line);
}

function wrapProviderHandler(
	provider: AuthRouteHandler,
	method: "GET" | "POST",
): AuthRouteHandler {
	return async (request, context) => {
		const correlationId = resolveAuthBffCorrelationId(
			request.headers.get(AUTH_BFF_CORRELATION_HEADER),
		);
		const pathname = new URL(request.url).pathname;

		if (method === "POST" && !isTrustedAuthBffPost(request)) {
			return forbiddenResponse(correlationId);
		}

		try {
			const response = await provider(request, context);
			return stampCorrelation(response, correlationId);
		} catch {
			logAuthBffUnexpectedError({
				correlationId,
				method,
				pathname,
			});
			return safeInternalErrorResponse(correlationId);
		}
	};
}

function toAuthRouteHandler(handler: unknown): AuthRouteHandler {
	if (typeof handler !== "function") {
		throw new Error("@afenda/auth: Neon Auth handler is missing GET/POST");
	}
	return async (request, context) => {
		const result: unknown = await handler(request, context);
		if (!(result instanceof Response)) {
			throw new Error("@afenda/auth: Neon Auth handler must return a Response");
		}
		return result;
	};
}

/**
 * Next.js App Router handlers for `AUTH_API_BASE_PATH` (`/api/auth/[...path]`).
 * Keeps `@neondatabase/auth` usage inside `@afenda/auth` (ARCH-026 · N5 · PL-S7).
 * Governance wraps the provider protocol without replacing it.
 */
export function createAuthApiHandlers(): AuthApiHandlers {
	const provider = getNeonAuth().handler();
	return {
		GET: wrapProviderHandler(toAuthRouteHandler(provider.GET), "GET"),
		POST: wrapProviderHandler(toAuthRouteHandler(provider.POST), "POST"),
	};
}
