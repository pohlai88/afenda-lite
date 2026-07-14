import { getNeonAuth } from "./session";

/**
 * Next.js App Router handlers for `/api/auth/[...path]`.
 * Keeps `@neondatabase/auth` usage inside `@afenda/auth` (ARCH-026).
 */
export function createAuthApiHandlers() {
	return getNeonAuth().handler();
}
