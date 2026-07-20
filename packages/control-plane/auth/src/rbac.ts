import { redirect } from "next/navigation";

import { AUTH_FORBIDDEN_PATH } from "./auth-paths";
import type { Role } from "./role";
import { roleSatisfies } from "./roles";
import { getSession, type Session } from "./session";

/**
 * Coarse shell guard against the session role signal (GUIDE-018 I1.4).
 * Unauthenticated → `/auth/login` (via `getSession`).
 * Authenticated but insufficient role → `AUTH_FORBIDDEN_PATH` (`/403`).
 *
 * Does not replace ARCH-023 permission-code checks (`hasPermission`).
 *
 * Hierarchy for shell wiring: `admin` satisfies `operator`;
 * `client` is exclusive to the client role signal.
 */

/**
 * Require an authenticated session with the given coarse role signal.
 * Returns the session on success; never returns null.
 */
export async function requireRole(role: Role): Promise<Session> {
	const session = await getSession();

	if (!roleSatisfies(session.role, role)) {
		redirect(AUTH_FORBIDDEN_PATH);
	}

	return session;
}
