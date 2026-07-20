/**
 * Public Neon Auth UI path segments under `/auth/*` (ARCH-026 · GUIDE-018 I1.2).
 * `SIGN_IN` is `login` so gate redirects (`AUTH_LOGIN_PATH`) match rendered forms.
 * PL-S1 — Pre-Login public route contract (auth URL SSOT).
 */

import { JOIN_PATH } from "./join-paths";

export const AUTH_BASE_PATH = "/auth" as const;

/**
 * Same-origin Neon Auth BFF catch-all (`apps/web/app/api/auth/[...path]`).
 * Browser client talks here; server proxies to `NEON_AUTH_BASE_URL` (ARCH-026 · N5).
 */
export const AUTH_API_BASE_PATH = "/api/auth" as const;

/** Anonymous marketing / entry landing (apps/web `app/(public)/page.tsx`). */
export const PUBLIC_LANDING_PATH = "/" as const;

/** Afenda overrides on better-auth-ui defaults (`sign-in` → `login`). */
export const AFENDA_AUTH_VIEW_PATHS = {
	ACCEPT_INVITATION: "accept-invitation",
	CALLBACK: "callback",
	EMAIL_OTP: "email-otp",
	FORGOT_PASSWORD: "forgot-password",
	MAGIC_LINK: "magic-link",
	RECOVER_ACCOUNT: "recover-account",
	RESET_PASSWORD: "reset-password",
	SIGN_IN: "login",
	SIGN_OUT: "sign-out",
	SIGN_UP: "sign-up",
	TWO_FACTOR: "two-factor",
} as const;

export type AfendaAuthViewPath =
	(typeof AFENDA_AUTH_VIEW_PATHS)[keyof typeof AFENDA_AUTH_VIEW_PATHS];

/** Build `/auth/<segment>` from a view-path segment (single join rule). */
function authUiPath<const S extends string>(
	segment: S,
): `${typeof AUTH_BASE_PATH}/${S}` {
	return `${AUTH_BASE_PATH}/${segment}`;
}

/** Gate + Neon UI login URL — single SSOT for `AUTH_LOGIN_PATH`. */
export const AUTH_LOGIN_PATH = authUiPath(AFENDA_AUTH_VIEW_PATHS.SIGN_IN);

export const AUTH_FORGOT_PASSWORD_PATH = authUiPath(
	AFENDA_AUTH_VIEW_PATHS.FORGOT_PASSWORD,
);

export const AUTH_RESET_PASSWORD_PATH = authUiPath(
	AFENDA_AUTH_VIEW_PATHS.RESET_PASSWORD,
);

export const AUTH_SIGN_OUT_PATH = authUiPath(AFENDA_AUTH_VIEW_PATHS.SIGN_OUT);

/**
 * Neon mail landing — redirect-only (`next.config` → `/join`).
 * Not a public Auth UI page; not in `PUBLIC_AUTH_PATHS`.
 */
export const AUTH_ACCEPT_INVITATION_PATH = authUiPath(
	AFENDA_AUTH_VIEW_PATHS.ACCEPT_INVITATION,
);

/**
 * Authenticated-but-forbidden shell (GUIDE-018 I1.4 · ARCH-026).
 * `requireRole` redirects here when the session role does not satisfy the gate.
 */
export const AUTH_FORBIDDEN_PATH = "/403" as const;

/**
 * Undeclared Neon/better-auth-ui alias — never silently accepted as public.
 * Canonical login is `AUTH_LOGIN_PATH` (`login`), not `sign-in`.
 */
const REJECTED_SIGN_IN_SEGMENT = "sign-in" as const;

export const REJECTED_AUTH_PATH_ALIASES = [
	authUiPath(REJECTED_SIGN_IN_SEGMENT),
] as const;

export type RejectedAuthPathAlias = (typeof REJECTED_AUTH_PATH_ALIASES)[number];

const REJECTED_AUTH_PATH_ALIAS_SET = new Set<string>(
	REJECTED_AUTH_PATH_ALIASES,
);

export function isRejectedAuthPathAlias(
	pathname: string,
): pathname is RejectedAuthPathAlias {
	return REJECTED_AUTH_PATH_ALIAS_SET.has(pathname);
}

/**
 * Public `/auth/[path]` Auth UI surfaces (GUIDE-018 I1.2).
 * Invitee credential creation is invitation-only via `/join` (Neon AcceptInvitationCard).
 * `sign-up` is not a public Auth UI page (404). Neon mail accept-invitation is
 * redirect-only → `/join` (I1.3).
 */
export const PUBLIC_AUTH_PATHS = [
	AFENDA_AUTH_VIEW_PATHS.SIGN_IN,
	AFENDA_AUTH_VIEW_PATHS.FORGOT_PASSWORD,
	AFENDA_AUTH_VIEW_PATHS.RESET_PASSWORD,
	AFENDA_AUTH_VIEW_PATHS.SIGN_OUT,
] as const;

export type PublicAuthPath = (typeof PUBLIC_AUTH_PATHS)[number];

/** Full public Auth UI URLs — same order as `PUBLIC_AUTH_PATHS`. */
export const PUBLIC_AUTH_FULL_PATHS = [
	AUTH_LOGIN_PATH,
	AUTH_FORGOT_PASSWORD_PATH,
	AUTH_RESET_PASSWORD_PATH,
	AUTH_SIGN_OUT_PATH,
] as const;

const PUBLIC_AUTH_PATH_SET = new Set<string>(PUBLIC_AUTH_PATHS);

export function isPublicAuthPath(path: string): path is PublicAuthPath {
	return PUBLIC_AUTH_PATH_SET.has(path);
}

/**
 * Document-navigation Pre-Login public pages (PL-S1).
 * Gate bypasses, protected matchers, and API paths are classified separately in
 * `apps/web/features/auth/pre-login-route-contract.ts`.
 */
export const PRE_LOGIN_PUBLIC_PATHS = [
	PUBLIC_LANDING_PATH,
	...PUBLIC_AUTH_FULL_PATHS,
	JOIN_PATH,
	AUTH_FORBIDDEN_PATH,
] as const;

export type PreLoginPublicPath = (typeof PRE_LOGIN_PUBLIC_PATHS)[number];

const PRE_LOGIN_PUBLIC_PATH_SET = new Set<string>(PRE_LOGIN_PUBLIC_PATHS);

export function isPreLoginPublicPath(
	pathname: string,
): pathname is PreLoginPublicPath {
	return PRE_LOGIN_PUBLIC_PATH_SET.has(pathname);
}
