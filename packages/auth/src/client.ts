import { createAuthClient } from "@neondatabase/auth/next";

export type { AfendaAuthViewPath, PublicAuthPath } from "./auth-paths";
export {
	AFENDA_AUTH_VIEW_PATHS,
	AUTH_BASE_PATH,
	AUTH_LOGIN_PATH,
	isPublicAuthPath,
	PUBLIC_AUTH_PATHS,
} from "./auth-paths";
export { JOIN_PATH } from "./join-paths";

/**
 * Browser Neon Auth client for Neon Auth UI (`NeonAuthUIProvider`).
 * Talks to same-origin `/api/auth/*` (proxied by `createAuthApiHandlers`).
 * Import only from Client Components via `@afenda/auth/client` (ARCH-026).
 */

export type BrowserAuthClient = ReturnType<typeof createAuthClient>;

let browserAuthClient: BrowserAuthClient | undefined;

export function getBrowserAuthClient(): BrowserAuthClient {
	if (!browserAuthClient) {
		browserAuthClient = createAuthClient();
	}
	return browserAuthClient;
}
