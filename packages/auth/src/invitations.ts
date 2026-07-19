import { env } from "@afenda/env";
import { fail, ok, type Result } from "@afenda/errors/result";
import { headers } from "next/headers";

import { failFromInviteHttpStatus } from "./auth-failure";
import { requireAppOrigin } from "./join-paths";
import type { Role } from "./role";
import { toNeonOrgRole } from "./roles";
import { getSession } from "./session";

const NEON_AUTH_SERVER_PROXY_HEADER = "x-neon-auth-server-proxy";

export type InviteOrgMemberInput = {
	email: string;
	orgId: string;
	role: Role;
};

export type InviteOrgMemberData = {
	data: unknown;
	/** Neon invitation id when the invite response includes one; otherwise null. */
	invitationId: string | null;
};

function normalizeInviteEmail(email: string): string {
	return email.trim().toLowerCase();
}

/**
 * Pull invitation id from Neon Auth invite-member JSON without inventing ids.
 * Accepts common Better Auth / Neon envelope shapes only.
 */
export function extractInvitationId(data: unknown): string | null {
	if (typeof data !== "object" || data === null) {
		return null;
	}

	const record = data as Record<string, unknown>;

	if (typeof record.id === "string" && record.id.trim().length > 0) {
		return record.id.trim();
	}

	if (typeof record.invitationId === "string" && record.invitationId.trim()) {
		return record.invitationId.trim();
	}

	if (typeof record.invitation === "object" && record.invitation !== null) {
		return extractInvitationId(record.invitation);
	}

	if (typeof record.data === "object" && record.data !== null) {
		return extractInvitationId(record.data);
	}

	return null;
}

/**
 * Send a Neon Auth organization invitation.
 * Caller must pass the active session org; Neon Auth SDK usage stays in this package.
 *
 * Returns `@afenda/errors` `Result` — web Server Actions map to `ActionResult`.
 *
 * Neon Auth delivers the invite mail via the project Zoho SMTP `email_provider`
 * (ARCH-026) — not app-side SMTP. For optional app-owned compose templates, use
 * `OnboardingInviteEmail` / `renderOnboardingInviteEmail` from `@afenda/emails`
 * with `buildInviteJoinUrl(invitationId)` — do not replace this Neon send path.
 * Invite `Origin` is always production `APP_URL` (never request host).
 */
export async function inviteOrgMember(
	input: InviteOrgMemberInput,
): Promise<Result<InviteOrgMemberData>> {
	const session = await getSession();

	if (session.orgId !== input.orgId) {
		return fail(
			"FORBIDDEN",
			"Invitation refuses an organization other than the active session org",
		);
	}

	const email = normalizeInviteEmail(input.email);
	if (email.length === 0) {
		return fail("BAD_REQUEST", "Invitation requires a non-empty email");
	}

	const baseUrl = env.NEON_AUTH_BASE_URL;
	const appOrigin = requireAppOrigin();
	const headerStore = await headers();
	const cookieHeader = headerStore.get("cookie") ?? "";

	const url = new URL(
		"organization/invite-member",
		baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
	);

	const response = await fetch(url.toString(), {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Cookie: cookieHeader,
			Origin: appOrigin,
			Referer: `${appOrigin}/`,
			[NEON_AUTH_SERVER_PROXY_HEADER]: "nextjs",
		},
		body: JSON.stringify({
			email,
			role: toNeonOrgRole(input.role),
			organizationId: input.orgId,
			resend: true,
		}),
	});

	if (!response.ok) {
		return failFromInviteHttpStatus(response.status);
	}

	const text = await response.text();
	let parsed: unknown = null;
	try {
		parsed = text ? JSON.parse(text) : null;
	} catch {
		parsed = null;
	}

	return ok({ data: parsed, invitationId: extractInvitationId(parsed) });
}
