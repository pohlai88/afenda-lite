/**
 * Public Neon Auth UI path segments under `/auth/*` (ARCH-026 · GUIDE-018 I1.2).
 * `SIGN_IN` is `login` so gate redirects (`AUTH_LOGIN_PATH`) match rendered forms.
 */

export const AUTH_BASE_PATH = "/auth";

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

/** Gate + Neon UI login URL — single SSOT for `AUTH_LOGIN_PATH`. */
export const AUTH_LOGIN_PATH =
	`${AUTH_BASE_PATH}/${AFENDA_AUTH_VIEW_PATHS.SIGN_IN}` as const;

/**
 * Public `/auth/[path]` Neon Auth UI surfaces (GUIDE-018 I1.2 + invitee sign-up).
 * Neon mail `/auth/accept-invitation` is a sibling redirect segment → `/join` (I1.3).
 */
export const PUBLIC_AUTH_PATHS = [
	AFENDA_AUTH_VIEW_PATHS.SIGN_IN,
	AFENDA_AUTH_VIEW_PATHS.FORGOT_PASSWORD,
	AFENDA_AUTH_VIEW_PATHS.RESET_PASSWORD,
	AFENDA_AUTH_VIEW_PATHS.SIGN_OUT,
	AFENDA_AUTH_VIEW_PATHS.SIGN_UP,
] as const;

export type PublicAuthPath = (typeof PUBLIC_AUTH_PATHS)[number];

const PUBLIC_AUTH_PATH_SET = new Set<string>(PUBLIC_AUTH_PATHS);

export function isPublicAuthPath(path: string): path is PublicAuthPath {
	return PUBLIC_AUTH_PATH_SET.has(path);
}
