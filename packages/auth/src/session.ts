import { env } from "@afenda/env";
import { createNeonAuth, type NeonAuth } from "@neondatabase/auth/next/server";
import { redirect } from "next/navigation";
import { cache } from "react";

import { AUTH_LOGIN_PATH } from "./auth-paths";
import { toSessionRole } from "./roles";

/** Coarse shell / routing signal — not the ARCH-023 permission catalogue. */
export type Role = "admin" | "operator" | "client";

/**
 * Typed Afenda session. `orgId` is always present when this value exists —
 * `getSession()` never returns null and never invents a missing org.
 */
export type Session = {
	userId: string;
	orgId: string;
	role: Role;
};

let neonAuth: NeonAuth | undefined;

/** Package-internal Neon Auth singleton (shared by S3.2+). Not a public export. */
export function getNeonAuth(): NeonAuth {
	if (!neonAuth) {
		neonAuth = createNeonAuth({
			baseUrl: env.NEON_AUTH_BASE_URL,
			cookies: { secret: env.NEON_AUTH_COOKIE_SECRET },
		});
	}
	return neonAuth;
}

async function resolveSession(): Promise<Session> {
	const auth = getNeonAuth();
	const { data, error } = await auth.getSession();

	if (error || !data?.user?.id) {
		redirect(AUTH_LOGIN_PATH);
	}

	const orgId = data.session.activeOrganizationId;
	if (typeof orgId !== "string" || orgId.length === 0) {
		throw new Error(
			"@afenda/auth: active organization missing from session — refuse silent org default",
		);
	}

	const { data: memberRole, error: roleError } =
		await auth.organization.getActiveMemberRole({
			query: { organizationId: orgId },
		});

	const neonRole = memberRole?.role;
	if (roleError || !neonRole) {
		throw new Error(
			"@afenda/auth: active organization membership role unresolved",
		);
	}

	return {
		userId: data.user.id,
		orgId,
		role: toSessionRole(neonRole),
	};
}

/**
 * Resolve the authenticated session or redirect to login.
 * Never returns null. Never fabricates `orgId` when the active org is absent.
 * Request-scoped dedupe via `React.cache` (RSC Accelint).
 */
export const getSession: () => Promise<Session> = cache(resolveSession);
