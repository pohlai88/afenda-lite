/**
 * PL-S1 — Pre-Login route classes composed for apps/web.
 * Auth URL SSOT remains `@afenda/auth` (`auth-paths` · `join-paths`).
 */

import {
	AUTH_ACCEPT_INVITATION_PATH,
	AUTH_API_BASE_PATH,
	CLIENT_HOME_PATH,
	OPERATOR_HOME_PATH,
	PRE_LOGIN_PUBLIC_PATHS,
	type PreLoginPublicPath,
} from "@afenda/auth/client";

import {
	CLIENT_DASHBOARD_ALIAS_PATH,
	CLIENT_GATE_PATHS,
} from "@/features/auth/client-paths";

/** Document-public pages — re-export of `@afenda/auth` allowlist. */
export const PRE_LOGIN_PUBLIC_ROUTE_PATHS = PRE_LOGIN_PUBLIC_PATHS;

export type { PreLoginPublicPath };

/** Session-gate bypass surfaces (client gate aliases). */
export const PRE_LOGIN_GATE_BYPASS_PATHS = CLIENT_GATE_PATHS;

/** Platform health probes (REST-001 api-now) — Pre-Login API class. */
export const HEALTH_LIVENESS_PATH = "/api/health/liveness" as const;
export const HEALTH_READINESS_PATH = "/api/health/readiness" as const;

/** Prometheus scrape (token-gated; fail closed when unset). */
export const METRICS_SCRAPE_PATH = "/api/metrics" as const;

/**
 * Pre-Login API surfaces (auth BFF + platform health + metrics scrape).
 * Session cookie/org APIs are post-login and intentionally excluded.
 */
export const PRE_LOGIN_API_PATHS = [
	AUTH_API_BASE_PATH,
	HEALTH_LIVENESS_PATH,
	HEALTH_READINESS_PATH,
	METRICS_SCRAPE_PATH,
] as const;

export type PreLoginApiPath = (typeof PRE_LOGIN_API_PATHS)[number];

/**
 * Next.js proxy matcher inventory (PL-S1 protected class).
 * `apps/web/proxy.ts` `config.matcher` must list the same paths as **static
 * string literals** — Next cannot statically parse spreads of this constant.
 */
export const SESSION_GATE_PROTECTED_MATCHERS = [
	"/account/:path*",
	"/dashboard/:path*",
	"/admin/:path*",
	"/client/:path*",
	"/playground/:path*",
] as const;

export type SessionGateProtectedMatcher =
	(typeof SESSION_GATE_PROTECTED_MATCHERS)[number];

/**
 * Post-login homes that must never appear in the public allowlist.
 * Coarse role homes + legacy client dashboard alias only.
 */
export const POST_LOGIN_PATHS_NOT_PUBLIC = [
	CLIENT_HOME_PATH,
	OPERATOR_HOME_PATH,
	CLIENT_DASHBOARD_ALIAS_PATH,
] as const;

/** Declared redirect source (next.config → JOIN_PATH); not a public page. */
export { AUTH_ACCEPT_INVITATION_PATH };
