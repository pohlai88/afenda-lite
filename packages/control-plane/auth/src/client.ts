import { createAuthClient } from "@neondatabase/auth/next";

export type {
	AfendaAuthViewPath,
	PreLoginPublicPath,
	PublicAuthPath,
	RejectedAuthPathAlias,
} from "./auth-paths";
export {
	AFENDA_AUTH_VIEW_PATHS,
	AUTH_ACCEPT_INVITATION_PATH,
	AUTH_API_BASE_PATH,
	AUTH_BASE_PATH,
	AUTH_FORBIDDEN_PATH,
	AUTH_FORGOT_PASSWORD_PATH,
	AUTH_LOGIN_PATH,
	AUTH_RESET_PASSWORD_PATH,
	AUTH_SIGN_OUT_PATH,
	isPreLoginPublicPath,
	isPublicAuthPath,
	isRejectedAuthPathAlias,
	PRE_LOGIN_PUBLIC_PATHS,
	PUBLIC_AUTH_FULL_PATHS,
	PUBLIC_AUTH_PATHS,
	PUBLIC_LANDING_PATH,
	REJECTED_AUTH_PATH_ALIASES,
} from "./auth-paths";
export type { JoinInvitationQuery } from "./join-paths";
export {
	JOIN_INVITATION_ID_MAX_LENGTH,
	JOIN_PATH,
	parseJoinInvitationQuery,
} from "./join-paths";
export type { PostLoginTarget } from "./post-login";
export {
	CLIENT_HOME_PATH,
	OPERATOR_HOME_PATH,
	POST_LOGIN_CALLBACK_PARAM,
	resolvePostLoginPath,
	resolveRoleHome,
	sanitizeCallbackUrl,
} from "./post-login";
export type { Role } from "./role";

/**
 * Browser Neon Auth client for Neon Auth UI (`NeonAuthUIProvider`).
 * Talks to same-origin `${AUTH_API_BASE_PATH}/*` (proxied by `createAuthApiHandlers`).
 * Import only from Client Components via `@afenda/auth/client` (ARCH-026 · N5).
 */

export type BrowserAuthClient = ReturnType<typeof createAuthClient>;

let browserAuthClient: BrowserAuthClient | undefined;

export function getBrowserAuthClient(): BrowserAuthClient {
	if (!browserAuthClient) {
		browserAuthClient = createAuthClient();
	}
	return browserAuthClient;
}

/** Clears the browser client singleton — test harness only. */
export function resetBrowserAuthClientForTests(): void {
	browserAuthClient = undefined;
}
