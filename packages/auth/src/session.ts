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

/**
 * Route Handler session — includes normalized email for ownership checks.
 * Returns `null` instead of redirecting (API-002 JSON 401 path).
 */
export type ApiSession = Session & {
	email: string;
};

type SessionResolveFailure =
	| "unauthenticated"
	| "missing_org"
	| "missing_email"
	| "missing_role";

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

function normalizeSessionEmail(email: unknown): string | null {
	if (typeof email !== "string") {
		return null;
	}
	const normalized = email.trim().toLowerCase();
	return normalized.length > 0 ? normalized : null;
}

async function loadApiSession(): Promise<
	| { ok: true; session: ApiSession }
	| { ok: false; reason: SessionResolveFailure }
> {
	const auth = getNeonAuth();
	const { data, error } = await auth.getSession();

	if (error || !data?.user?.id) {
		return { ok: false, reason: "unauthenticated" };
	}

	const orgId = data.session.activeOrganizationId;
	if (typeof orgId !== "string" || orgId.length === 0) {
		return { ok: false, reason: "missing_org" };
	}

	const email = normalizeSessionEmail(data.user.email);
	if (!email) {
		return { ok: false, reason: "missing_email" };
	}

	const { data: memberRole, error: roleError } =
		await auth.organization.getActiveMemberRole({
			query: { organizationId: orgId },
		});

	const neonRole = memberRole?.role;
	if (roleError || !neonRole) {
		return { ok: false, reason: "missing_role" };
	}

	return {
		ok: true,
		session: {
			userId: data.user.id,
			orgId,
			role: toSessionRole(neonRole),
			email,
		},
	};
}

/** Request-scoped Neon session load shared by `getSession` and `getApiSession`. */
const loadApiSessionCached = cache(loadApiSession);

async function resolveSession(): Promise<Session> {
	const loaded = await loadApiSessionCached();
	if (!loaded.ok) {
		if (loaded.reason === "unauthenticated") {
			redirect(AUTH_LOGIN_PATH);
		}
		if (loaded.reason === "missing_org") {
			throw new Error(
				"@afenda/auth: active organization missing from session — refuse silent org default",
			);
		}
		if (loaded.reason === "missing_email") {
			throw new Error(
				"@afenda/auth: authenticated user email missing from session",
			);
		}
		throw new Error(
			"@afenda/auth: active organization membership role unresolved",
		);
	}

	return {
		userId: loaded.session.userId,
		orgId: loaded.session.orgId,
		role: loaded.session.role,
	};
}

/**
 * Resolve the authenticated session or redirect to login.
 * Never returns null. Never fabricates `orgId` when the active org is absent.
 * Request-scoped dedupe via `React.cache` (RSC Accelint).
 */
export const getSession: () => Promise<Session> = cache(resolveSession);

/**
 * Authenticated session for Route Handlers — `null` when unauthenticated or
 * incomplete (missing org, role, or email). Never redirects.
 * Shares the same request-scoped Neon load as `getSession`.
 */
export async function getApiSession(): Promise<ApiSession | null> {
	const loaded = await loadApiSessionCached();
	return loaded.ok ? loaded.session : null;
}
