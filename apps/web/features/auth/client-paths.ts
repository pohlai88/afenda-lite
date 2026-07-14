/**
 * Client URL constants (Target under `app/(client)/client/{(gate)|(workspace)}`).
 * Closed product restore routes (onboarding / profile / declare) are intentionally absent.
 */

export const CLIENT_WORKSPACE_PATH = "/client";
export const CLIENT_DASHBOARD_PATH = "/client/dashboard";

/** Session-gate bypass surfaces (ARCH-012 §3.12). */
export const CLIENT_LOGIN_PATH = "/client/login";
export const CLIENT_PREVIEW_UNAVAILABLE_PATH = "/client/preview-unavailable";

export const CLIENT_GATE_PATHS = [
	CLIENT_LOGIN_PATH,
	CLIENT_PREVIEW_UNAVAILABLE_PATH,
] as const;
