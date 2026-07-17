/**
 * Client URL constants (Target under `app/(client)/client/{(gate)|(workspace)}`).
 * Closed product restore routes (onboarding / profile / declare) are intentionally absent.
 *
 * `/client/declarations` is the client post-login home; the governed `@afenda/auth`
 * resolver (`CLIENT_HOME_PATH`) is the SSOT. A drift-guard test pins this
 * constant to that resolver value so the landing path cannot diverge.
 * `/client/dashboard` remains an alias redirect to the declarations list.
 */

export const CLIENT_WORKSPACE_PATH = "/client";
/** Alias redirect target — not the role home SSOT (see CLIENT_HOME_PATH). */
export const CLIENT_DASHBOARD_ALIAS_PATH = "/client/dashboard";
/** Client post-login / workspace home (pinned to `@afenda/auth` CLIENT_HOME_PATH). */
export const CLIENT_DASHBOARD_PATH = "/client/declarations";

/** Session-gate bypass surfaces (ARCH-012 §3.12). */
export const CLIENT_LOGIN_PATH = "/client/login";
export const CLIENT_PREVIEW_UNAVAILABLE_PATH = "/client/preview-unavailable";

export const CLIENT_GATE_PATHS = [
	CLIENT_LOGIN_PATH,
	CLIENT_PREVIEW_UNAVAILABLE_PATH,
] as const;
