import { env } from "@afenda/env";
import type { AppError } from "@afenda/errors";
import {
	ERROR_HTTP_STATUS,
	httpErrorBody,
	retryAfterSeconds,
} from "@afenda/errors/http";
import {
	applyRateLimitHeaders,
	applyRetryAfterHeader,
	applyServerTimingHeader,
	type RateLimitHeaderQuota,
} from "@afenda/http";
import { createLogger } from "@afenda/logger";
import {
	checkRateLimit,
	type RateLimitQuota,
	toRateLimitAppError,
} from "@afenda/rate-limit";

import { getNeonAuth } from "./neon-auth";

const authBffLogger = createLogger({ service: "afenda-auth-bff" });

/** Wire header for BFF correlation (API-007 twin — package-local, no apps/web import). */
export const AUTH_BFF_CORRELATION_HEADER = "x-correlation-id" as const;

const UNKNOWN_CLIENT_IP = "unknown";
const SERVER_TIMING_METRIC = "auth_bff";

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

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1"]);

function isVercelProductionRuntime(): boolean {
	return process.env.VERCEL_ENV === "production";
}

function isLoopbackHostname(hostname: string): boolean {
	return LOOPBACK_HOSTNAMES.has(hostname.toLowerCase());
}

function hostHeaderHostname(host: string): string {
	return host.split(":")[0]?.toLowerCase() ?? "";
}

/**
 * POST Origin/Host allowlist against `APP_URL` (same-origin browser + trusted proxy host).
 * Non-production also trusts loopback Origins/Hosts so local `next dev` works when
 * `.env.local` keeps production-shaped `APP_URL` (aligns with `resolveAuthUiOrigin`).
 * Vercel production never trusts loopback — closes CSRF from localhost → prod.
 * GET remains provider-pass-through (callbacks / session reads).
 */
export function isTrustedAuthBffPost(request: Request): boolean {
	const appUrl = new URL(env.APP_URL);
	const appOrigin = appUrl.origin;
	const appHost = appUrl.host.toLowerCase();

	const origin = firstHeaderValue(request.headers.get("origin"));
	if (origin) {
		try {
			const originUrl = new URL(origin);
			if (originUrl.origin === appOrigin) {
				return true;
			}
			return (
				!isVercelProductionRuntime() && isLoopbackHostname(originUrl.hostname)
			);
		} catch {
			return false;
		}
	}

	const host = firstHeaderValue(
		request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
	);
	if (!host) {
		return false;
	}
	if (host.toLowerCase() === appHost) {
		return true;
	}
	return (
		!isVercelProductionRuntime() && isLoopbackHostname(hostHeaderHostname(host))
	);
}

function toHeaderQuota(quota: RateLimitQuota): RateLimitHeaderQuota {
	return {
		limit: quota.limit,
		remaining: quota.remaining,
		resetEpochMs: quota.resetEpochMs,
	};
}

function stampBffResponse(
	response: Response,
	input: {
		correlationId: string;
		startTimeMs: number;
		quota?: RateLimitQuota;
	},
): Response {
	response.headers.set(AUTH_BFF_CORRELATION_HEADER, input.correlationId);
	applyServerTimingHeader(response.headers, input.startTimeMs, {
		metric: SERVER_TIMING_METRIC,
	});
	if (input.quota !== undefined) {
		applyRateLimitHeaders(response.headers, toHeaderQuota(input.quota));
	}
	return response;
}

function clientIpFromRequest(request: Request): string {
	const forwarded = firstHeaderValue(request.headers.get("x-forwarded-for"));
	if (forwarded) {
		return forwarded;
	}
	const realIp = firstHeaderValue(request.headers.get("x-real-ip"));
	if (realIp) {
		return realIp;
	}
	return UNKNOWN_CLIENT_IP;
}

function forbiddenResponse(
	correlationId: string,
	startTimeMs: number,
): Response {
	return stampBffResponse(new Response(null, { status: 403 }), {
		correlationId,
		startTimeMs,
	});
}

function safeInternalErrorResponse(
	correlationId: string,
	startTimeMs: number,
): Response {
	return stampBffResponse(new Response(null, { status: 500 }), {
		correlationId,
		startTimeMs,
	});
}

function appErrorResponse(input: {
	correlationId: string;
	startTimeMs: number;
	error: AppError;
	quota?: RateLimitQuota;
}): Response {
	const retryAfter = retryAfterSeconds(input.error.details);
	const headers = new Headers({
		"content-type": "application/json",
		[AUTH_BFF_CORRELATION_HEADER]: input.correlationId,
	});
	if (retryAfter !== undefined) {
		applyRetryAfterHeader(headers, retryAfter);
	}
	if (input.quota !== undefined) {
		applyRateLimitHeaders(headers, toHeaderQuota(input.quota));
	}
	applyServerTimingHeader(headers, input.startTimeMs, {
		metric: SERVER_TIMING_METRIC,
	});
	return new Response(
		JSON.stringify(
			httpErrorBody(input.error.code, input.error.message, input.error.details),
		),
		{
			status: ERROR_HTTP_STATUS[input.error.code],
			headers,
		},
	);
}

function logAuthBffUnexpectedError(input: {
	correlationId: string;
	method: string;
	pathname: string;
}): void {
	authBffLogger.child({ correlationId: input.correlationId }).error({
		event: "auth_bff.unexpected_error",
		method: input.method,
		path: input.pathname,
	});
}

function wrapProviderHandler(
	provider: AuthRouteHandler,
	method: "GET" | "POST",
): AuthRouteHandler {
	return async (request, context) => {
		const startTimeMs = Date.now();
		const correlationId = resolveAuthBffCorrelationId(
			request.headers.get(AUTH_BFF_CORRELATION_HEADER),
		);
		const pathname = new URL(request.url).pathname;

		if (method === "POST" && !isTrustedAuthBffPost(request)) {
			return forbiddenResponse(correlationId, startTimeMs);
		}

		let postQuota: RateLimitQuota | undefined;
		if (method === "POST") {
			const limit = await checkRateLimit({
				bucket: "auth_bff_post",
				key: `${clientIpFromRequest(request)}:${pathname}`,
			});
			if (!limit.ok) {
				const error = toRateLimitAppError(limit);
				const event =
					limit.reason === "unavailable"
						? "auth_bff.rate_limit_unavailable"
						: "auth_bff.rate_limited";
				authBffLogger.child({ correlationId }).warn({
					event,
					path: pathname,
					code: error.code,
				});
				return appErrorResponse({
					correlationId,
					startTimeMs,
					error,
					...(limit.reason === "rate_limited" ? { quota: limit.quota } : {}),
				});
			}
			postQuota = limit.quota;
		}

		try {
			const response = await provider(request, context);
			return stampBffResponse(response, {
				correlationId,
				startTimeMs,
				...(postQuota !== undefined ? { quota: postQuota } : {}),
			});
		} catch {
			logAuthBffUnexpectedError({
				correlationId,
				method,
				pathname,
			});
			return safeInternalErrorResponse(correlationId, startTimeMs);
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
