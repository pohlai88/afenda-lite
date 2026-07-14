import { env } from "@afenda/env";
import { headers } from "next/headers";

import { buildJoinUrl } from "./join-paths";
import { getSession, type Role } from "./session";

const NEON_AUTH_SERVER_PROXY_HEADER = "x-neon-auth-server-proxy";

type NeonOrgRole = "owner" | "admin" | "member";

/**
 * Invitation emails must use the production app origin so accept links
 * are never minted from a localhost Operator Origin while APP_URL is prod.
 */
function requireAppOrigin(): string {
	return new URL(env.APP_URL).origin;
}

/** Absolute `/join?invitationId=…` under production `APP_URL` (app-owned mail). */
export function buildInviteJoinUrl(invitationId: string): string {
	return buildJoinUrl({ invitationId, origin: requireAppOrigin() });
}

function mapRoleToNeonOrgRole(role: Role): NeonOrgRole {
	switch (role) {
		case "admin":
			return "owner";
		case "operator":
			return "admin";
		case "client":
			return "member";
		default: {
			const _exhaustive: never = role;
			throw new Error(`@afenda/auth: unhandled role: ${_exhaustive}`);
		}
	}
}

export type InviteOrgMemberInput = {
	email: string;
	orgId: string;
	role: Role;
};

export type InviteOrgMemberResult = {
	data: unknown;
};

/**
 * Send a Neon Auth organization invitation (shared email provider).
 * Caller must pass the active session org; Neon Auth SDK usage stays in this package.
 *
 * Neon Auth delivers the invite mail. For app-owned invitation mail, compose
 * `OnboardingInviteEmail` / `renderOnboardingInviteEmail` from `@afenda/emails`
 * with `buildInviteJoinUrl(invitationId)` — do not replace this Neon send path.
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

	const email = input.email.trim();
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
			role: mapRoleToNeonOrgRole(input.role),
			organizationId: input.orgId,
			resend: true,
		}),
	});

	const text = await response.text();
	let parsed: unknown = null;
	try {
		parsed = text ? JSON.parse(text) : null;
	} catch {
		parsed = { raw: text };
	}

	if (!response.ok) {
		const message =
			(parsed as { message?: string } | null)?.message ??
			(parsed as { error?: string } | null)?.error ??
			`Neon Auth organization/invite-member failed (${response.status})`;
		throw new Error(`@afenda/auth: ${message}`);
	}

	return { data: parsed };
}
