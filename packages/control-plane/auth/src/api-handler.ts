import { env, isProductionDeploymentNow } from "@afenda/env";
import {
	errorIngress,
	errorProject,
	type Failure,
	type ResultFailure,
} from "@afenda/errors";
import { http } from "@afenda/http";
import { logger } from "@afenda/logger";
import { type RateLimitQuotaProjection, rateLimit } from "@afenda/rate-limit";

import { getNeonAuth } from "./neon-auth";

const UNKNOWN_CLIENT_IP = "unknown";
const SERVER_TIMING_METRIC = "auth_bff";

type AuthRouteHandler = (
	request: Request,
	context: unknown,
) => Response | Promise<Response>;

/** Next.js App Router GET/POST handlers for `/api/auth/[...path]`. */
export interface AuthApiHandlers {
	GET: AuthRouteHandler;
	POST: AuthRouteHandler;
}

function firstHeaderValue(value: string | null): string | undefined {
	if (!value) {
		return;
	}
	const first = value.split(",")[0]?.trim();
	return first && first.length > 0 ? first : undefined;
}

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1"]);

function isVercelProductionRuntime(): boolean {
	return isProductionDeploymentNow();
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

function stampBffResponse(
	response: Response,
	input: {
		correlationId: string;
		startTimeMs: number;
		quota?: RateLimitQuotaProjection;
	},
): Response {
	response.headers.set(http.correlation.header, input.correlationId);
	http.headers.applyServerTiming(response.headers, input.startTimeMs, {
		metric: SERVER_TIMING_METRIC,
	});
	if (input.quota !== undefined) {
		http.headers.applyRateLimit(response.headers, input.quota);
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
	return appErrorResponse({
		correlationId,
		error: errorIngress.code("FORBIDDEN", {
			operation: "auth.bff",
		}),
		startTimeMs,
	});
}

function safeInternalErrorResponse(
	correlationId: string,
	startTimeMs: number,
): Response {
	return appErrorResponse({
		correlationId,
		error: errorIngress.code("INTERNAL_ERROR", {
			operation: "auth.bff",
			correlationId,
		}),
		startTimeMs,
	});
}

function appErrorResponse(input: {
	correlationId: string;
	startTimeMs: number;
	error: Failure | ResultFailure;
	quota?: RateLimitQuotaProjection;
}): Response {
	const projection = errorProject.http(input.error);
	const headers = new Headers(projection.headers);
	headers.set("content-type", "application/json");
	headers.set(http.correlation.header, input.correlationId);
	if (input.quota !== undefined) {
		http.headers.applyRateLimit(headers, input.quota);
	}
	http.headers.applyServerTiming(headers, input.startTimeMs, {
		metric: SERVER_TIMING_METRIC,
	});
	return new Response(JSON.stringify(projection.body), {
		headers,
		status: projection.status,
	});
}

function logAuthBffUnexpectedError(input: {
	correlationId: string;
	method: string;
	pathname: string;
}): void {
	logger.event(
		{
			level: "error",
			correlationId: input.correlationId,
			event: "auth_bff.unexpected_error",
			method: input.method,
			path: input.pathname,
		},
		{ service: "afenda-auth-bff" },
	);
}

function wrapProviderHandler(
	provider: AuthRouteHandler,
	method: "GET" | "POST",
): AuthRouteHandler {
	return async (request, context) => {
		const startTimeMs = Date.now();
		const correlationId = http.correlation.resolve(
			request.headers.get(http.correlation.header),
		);
		const { pathname } = new URL(request.url);

		if (method === "POST" && !isTrustedAuthBffPost(request)) {
			return forbiddenResponse(correlationId, startTimeMs);
		}

		let postQuota: RateLimitQuotaProjection | undefined;
		if (method === "POST") {
			const limit = await rateLimit.check({
				bucket: "auth_bff_post",
				identity: {
					ipAddress: clientIpFromRequest(request),
					pathname,
				},
			});
			if (!limit.ok) {
				const error = rateLimit.project.failure(limit);
				const diagnostics = rateLimit.project.diagnostics(limit);
				const event =
					diagnostics.outcome === "unavailable"
						? "auth_bff.rate_limit_unavailable"
						: "auth_bff.rate_limited";
				logger.event(
					{
						level: "warn",
						correlationId,
						code: errorProject.result(error).code,
						event,
						path: pathname,
					},
					{ service: "afenda-auth-bff" },
				);
				const quota = rateLimit.project.quota(limit);
				return appErrorResponse({
					correlationId,
					error,
					startTimeMs,
					...(quota === undefined ? {} : { quota }),
				});
			}
			postQuota = rateLimit.project.quota(limit);
		}

		try {
			const response = await provider(request, context);
			return stampBffResponse(response, {
				correlationId,
				startTimeMs,
				...(postQuota === undefined ? {} : { quota: postQuota }),
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
