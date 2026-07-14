import { redirect } from "next/navigation";

import { roleSatisfies } from "./roles";
import { getSession, type Role, type Session } from "./session";

const FORBIDDEN_PATH = "/403";

/**
 * Coarse shell guard against the session role signal.
 * Unauthenticated → `/auth/login` (via `getSession`).
 * Authenticated but insufficient role → `/403`.
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
		redirect(FORBIDDEN_PATH);
	}

	return session;
}
