import { env } from "@afenda/env";
import { errorResult, type Result } from "@afenda/errors";
import { headers } from "next/headers";

import { failFromInviteHttpStatus } from "./auth-failure";
import { requireAppOrigin } from "./join-paths";
import { normalizeNeonInvitationId } from "./neon-normalization";
import type { Role } from "./role";
import { toNeonOrgRole } from "./roles";
import { getSession } from "./session";

const NEON_AUTH_SERVER_PROXY_HEADER = "x-neon-auth-server-proxy";

export interface InviteOrgMemberInput {
	email: string;
	orgId: string;
	role: Role;
}

export interface InviteOrgMemberData {
	data: unknown;
	/** Neon invitation id when the invite response includes one; otherwise null. */
	invitationId: string | null;
}

function normalizeInviteEmail(email: string): string {
	return email.trim().toLowerCase();
}

/**
 * Pull invitation id from Neon Auth invite-member JSON without inventing ids.
 * Accepts common Better Auth / Neon envelope shapes only.
 */
export function extractInvitationId(data: unknown): string | null {
	return normalizeNeonInvitationId(data);
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
		return errorResult.fail("FORBIDDEN");
	}

	const email = normalizeInviteEmail(input.email);
	if (email.length === 0) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Invitation requires a non-empty email",
		});
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
		body: JSON.stringify({
			email,
			organizationId: input.orgId,
			resend: true,
			role: toNeonOrgRole(input.role),
		}),
		headers: {
			"Content-Type": "application/json",
			Cookie: cookieHeader,
			Origin: appOrigin,
			Referer: `${appOrigin}/`,
			[NEON_AUTH_SERVER_PROXY_HEADER]: "nextjs",
		},
		method: "POST",
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

	return errorResult.ok({
		data: parsed,
		invitationId: extractInvitationId(parsed),
	});
}
