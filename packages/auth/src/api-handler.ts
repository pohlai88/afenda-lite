import { getNeonAuth } from "./neon-auth";

/** Next.js App Router GET/POST handlers for `/api/auth/[...path]`. */
export type AuthApiHandlers = ReturnType<
	ReturnType<typeof getNeonAuth>["handler"]
>;

/**
 * Next.js App Router handlers for `AUTH_API_BASE_PATH` (`/api/auth/[...path]`).
 * Keeps `@neondatabase/auth` usage inside `@afenda/auth` (ARCH-026 · N5).
 */
export function createAuthApiHandlers(): AuthApiHandlers {
	return getNeonAuth().handler();
}
