import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

/**
 * N8 invitee fixture — verified Neon Auth user who is not an org member.
 * Password is aligned to `PREVIEW_CLIENT_*` (or `E2E_INVITEE_PASSWORD`) via
 * Neon Auth account hash copy so accept can use sign-in (no signup OTP).
 */

type NeonSql = (
	strings: TemplateStringsArray,
	...values: unknown[]
) => Promise<unknown>;

async function createNeonSql(databaseUrl: string): Promise<NeonSql> {
	const modulePath = resolve(
		process.cwd(),
		"packages/db/node_modules/@neondatabase/serverless/index.mjs",
	);
	const { neon } = (await import(pathToFileURL(modulePath).href)) as {
		neon: (url: string) => NeonSql;
	};
	return neon(databaseUrl);
}

export const N8_INVITEE_EMAIL =
	"e2e-invite-journey-1783849031170@afenda-lite.com" as const;

const PORTAL_ORG_ID = "4587e4c8-8119-4761-91ce-b874d3493aad";

export type InviteeCredentialPair = {
	email: string;
	password: string;
};

export function resolveN8InviteeCredentials(): InviteeCredentialPair | null {
	const email =
		process.env.E2E_INVITEE_EMAIL?.trim() || N8_INVITEE_EMAIL;
	const password =
		process.env.E2E_INVITEE_PASSWORD?.trim() ||
		process.env.PREVIEW_CLIENT_PASSWORD?.trim() ||
		"";
	if (!email || !password) {
		return null;
	}
	return { email, password };
}

/**
 * Ensure invitee can be invited: not a member; no pending invitation;
 * credential hash matches the preview-client (known local password).
 */
export async function prepareN8InviteeFixture(
	inviteeEmail: string = N8_INVITEE_EMAIL,
): Promise<void> {
	const databaseUrl = process.env.DATABASE_URL?.trim();
	if (!databaseUrl) {
		throw new Error("prepareN8InviteeFixture requires DATABASE_URL");
	}

	const passwordSourceEmail =
		process.env.PREVIEW_CLIENT_EMAIL?.trim() ||
		"preview-client@afenda-lite.com";
	const sql = await createNeonSql(databaseUrl);

	await sql`
		WITH src AS (
			SELECT a.password
			FROM neon_auth.account a
			INNER JOIN neon_auth."user" u ON u.id = a."userId"
			WHERE u.email = ${passwordSourceEmail}
				AND a."providerId" = 'credential'
			LIMIT 1
		)
		UPDATE neon_auth.account AS target
		SET
			password = (SELECT password FROM src),
			"updatedAt" = NOW()
		WHERE target."providerId" = 'credential'
			AND target."userId" = (
				SELECT id FROM neon_auth."user" WHERE email = ${inviteeEmail}
			)
	`;

	await sql`
		DELETE FROM neon_auth.member
		WHERE "organizationId" = ${PORTAL_ORG_ID}
			AND "userId" = (
				SELECT id FROM neon_auth."user" WHERE email = ${inviteeEmail}
			)
	`;

	await sql`
		DELETE FROM neon_auth.invitation
		WHERE email = ${inviteeEmail}
			AND status = 'pending'
	`;
}

/** Post-accept proof: invitation accepted and membership exists. */
export async function assertN8InviteAccepted(input: {
	inviteeEmail: string;
	invitationId: string;
}): Promise<void> {
	const databaseUrl = process.env.DATABASE_URL?.trim();
	if (!databaseUrl) {
		throw new Error("assertN8InviteAccepted requires DATABASE_URL");
	}

	const sql = await createNeonSql(databaseUrl);
	const invitations = (await sql`
		SELECT status
		FROM neon_auth.invitation
		WHERE id = ${input.invitationId}::uuid
		LIMIT 1
	`) as Array<{ status: string }>;

	const status = invitations[0]?.status;
	if (status !== "accepted") {
		throw new Error(
			`Expected invitation ${input.invitationId} status=accepted, got ${status ?? "missing"}`,
		);
	}

	const members = (await sql`
		SELECT 1 AS ok
		FROM neon_auth.member m
		INNER JOIN neon_auth."user" u ON u.id = m."userId"
		WHERE u.email = ${input.inviteeEmail}
			AND m."organizationId" = ${PORTAL_ORG_ID}
		LIMIT 1
	`) as Array<{ ok: number }>;

	if (!members[0]) {
		throw new Error(
			`Expected membership for ${input.inviteeEmail} in portal org after accept`,
		);
	}
}
