/**
 * Playwright env bootstrap. Prefer CI / shell / `.env.local` values already
 * present; only fills PLAYWRIGHT_BASE_URL default.
 */
export function loadPlaywrightEnv(): void {
	if (!process.env.PLAYWRIGHT_BASE_URL) {
		process.env.PLAYWRIGHT_BASE_URL = "http://localhost:3000";
	}
}
