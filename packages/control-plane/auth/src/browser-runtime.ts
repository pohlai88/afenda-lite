import { createAuthClient } from "@neondatabase/auth/next";

export type BrowserAuthClient = ReturnType<typeof createAuthClient>;

let browserAuthClient: BrowserAuthClient | undefined;

export function getBrowserAuthClient(): BrowserAuthClient {
	if (!browserAuthClient) {
		browserAuthClient = createAuthClient();
	}
	return browserAuthClient;
}

/** Package-internal test control; never exported by `@afenda/auth/client`. */
export function resetBrowserAuthClientForTests(): void {
	browserAuthClient = undefined;
}
