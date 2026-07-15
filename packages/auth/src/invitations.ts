import { env } from "@afenda/env";
import { headers } from "next/headers";

import { requireAppOrigin } from "./join-paths";
import { toNeonOrgRole } from "./roles";
import { getSession, type Role } from "./session";

const NEON_AUTH_SERVER_PROXY_HEADER = "x-neon-auth-server-proxy";

export type InviteOrgMemberInput = {
	email: string;
	orgId: string;
	role: Role;
};

export type InviteOrgMemberResult = {
	data: unknown;
};

function normalizeInviteEmail(email: string): string {
	return email.trim().toLowerCase();
}

/**
 * Send a Neon Auth organization invitation (shared email provider).
 * Caller must pass the active session org; Neon Auth SDK usage stays in this package.
 *
 * Neon Auth delivers the invite mail. For app-owned invitation mail, compose
 * `OnboardingInviteEmail` / `renderOnboardingInviteEmail` from `@afenda/emails`
 * with `buildInviteJoinUrl(invitationId)` — do not replace this Neon send path.
 * Invite `Origin` is always production `APP_URL` (never request host).
 */
export async function inviteOrgMember(
	input: InviteOrgMemberInput,
): Promise<InviteOrgMemberResult> {
	const session = await getSession();

	if (session.orgId !== input.orgId) {
		throw new Error(
			"@afenda/auth: inviteOrgMember refuses organization other than the active session org",
		);
	}

	const email = normalizeInviteEmail(input.email);
	if (email.length === 0) {
		throw new Error("@afenda/auth: inviteOrgMember requires a non-empty email");
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
		throw new Error(
			`@afenda/auth: organization invite failed (${response.status})`,
		);
	}

	const text = await response.text();
	let parsed: unknown = null;
	try {
		parsed = text ? JSON.parse(text) : null;
	} catch {
		parsed = null;
	}

	return { data: parsed };
}
