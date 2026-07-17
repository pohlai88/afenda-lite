/**
 * N13 worker-scoped Neon Auth tenancy factory.
 * Unique orgs/users per Playwright worker — never SHARED_ADMIN / PREVIEW_CLIENT
 * as login subjects. Password hashes are copied from a hash-template account
 * so `E2E_FACTORY_PASSWORD` must match that template’s plaintext.
 */

import { createNeonSql, type NeonSql } from "./neon-sql";

export type FactoryCredential = {
	email: string;
	password: string;
	userId: string;
};

export type FactoryOrg = {
	id: string;
	slug: string;
	name: string;
};

export type WorkerTenantHandle = {
	workerIndex: number;
	runId: string;
	orgA: FactoryOrg;
	orgB: FactoryOrg;
	operator: FactoryCredential;
	client: FactoryCredential;
	foreignOwner: FactoryCredential;
	/** Verified non-member of orgA — invite/join target. */
	invitee: FactoryCredential;
};

function requireDatabaseUrl(): string {
	const databaseUrl = process.env.DATABASE_URL?.trim();
	if (!databaseUrl) {
		throw new Error("N13 factory requires DATABASE_URL");
	}
	return databaseUrl;
}

/**
 * Plaintext for factory users. Must match the hash-template account password.
 * `E2E_FACTORY_PASSWORD` is explicit so the factory never depends on seed
 * account fixture passwords as shared configuration.
 */
function resolveFactoryPassword(): string | null {
	return process.env.E2E_FACTORY_PASSWORD?.trim() || null;
}

function resolveHashTemplateEmail(): string {
	return (
		process.env.E2E_FACTORY_HASH_TEMPLATE_EMAIL?.trim() ||
		process.env.PREVIEW_CLIENT_EMAIL?.trim() ||
		"preview-client@afenda-lite.com"
	);
}

/** True when provision/cleanup can run (honest skip when false). */
export function isFactoryEnvReady(): boolean {
	return Boolean(process.env.DATABASE_URL?.trim() && resolveFactoryPassword());
}

async function readTemplatePasswordHash(
	sql: NeonSql,
	templateEmail: string,
): Promise<string> {
	const rows = (await sql`
		SELECT a.password
		FROM neon_auth.account a
		INNER JOIN neon_auth."user" u ON u.id = a."userId"
		WHERE u.email = ${templateEmail}
			AND a."providerId" = 'credential'
			AND a.password IS NOT NULL
		LIMIT 1
	`) as Array<{ password: string }>;

	const hash = rows[0]?.password;
	if (!hash) {
		throw new Error(
			`N13 factory hash template missing credential password for ${templateEmail}`,
		);
	}
	return hash;
}

async function insertUser(input: {
	sql: NeonSql;
	email: string;
	name: string;
	userRole: string;
}): Promise<string> {
	const rows = (await input.sql`
		INSERT INTO neon_auth."user" (
			name,
			email,
			"emailVerified",
			role,
			"createdAt",
			"updatedAt"
		)
		VALUES (
			${input.name},
			${input.email},
			true,
			${input.userRole},
			NOW(),
			NOW()
		)
		RETURNING id
	`) as Array<{ id: string }>;

	const userId = rows[0]?.id;
	if (!userId) {
		throw new Error(`N13 factory failed to insert user ${input.email}`);
	}
	return userId;
}

async function insertCredentialAccount(input: {
	sql: NeonSql;
	userId: string;
	passwordHash: string;
}): Promise<void> {
	await input.sql`
		INSERT INTO neon_auth.account (
			"accountId",
			"providerId",
			"userId",
			password,
			"createdAt",
			"updatedAt"
		)
		VALUES (
			${input.userId},
			'credential',
			${input.userId}::uuid,
			${input.passwordHash},
			NOW(),
			NOW()
		)
	`;
}

async function insertOrganization(input: {
	sql: NeonSql;
	name: string;
	slug: string;
}): Promise<string> {
	const rows = (await input.sql`
		INSERT INTO neon_auth.organization (name, slug, "createdAt")
		VALUES (${input.name}, ${input.slug}, NOW())
		RETURNING id
	`) as Array<{ id: string }>;

	const orgId = rows[0]?.id;
	if (!orgId) {
		throw new Error(`N13 factory failed to insert org ${input.slug}`);
	}
	return orgId;
}

async function insertMember(input: {
	sql: NeonSql;
	organizationId: string;
	userId: string;
	role: "owner" | "admin" | "member";
}): Promise<void> {
	await input.sql`
		INSERT INTO neon_auth.member (
			"organizationId",
			"userId",
			role,
			"createdAt"
		)
		VALUES (
			${input.organizationId}::uuid,
			${input.userId}::uuid,
			${input.role},
			NOW()
		)
	`;
}

/**
 * Provision two real orgs + unique users for one Playwright worker.
 * Caller must invoke `cleanupWorkerTenant` (or use the worker fixture).
 */
export async function provisionWorkerTenant(
	workerIndex: number,
): Promise<WorkerTenantHandle> {
	const password = resolveFactoryPassword();
	if (!password) {
		throw new Error("provisionWorkerTenant requires E2E_FACTORY_PASSWORD");
	}

	const databaseUrl = requireDatabaseUrl();
	const sql = await createNeonSql(databaseUrl);
	const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
	const prefix = `e2e-w${workerIndex}-${runId}`;
	const passwordHash = await readTemplatePasswordHash(
		sql,
		resolveHashTemplateEmail(),
	);

	const orgASlug = `${prefix}-a`;
	const orgBSlug = `${prefix}-b`;
	const orgAId = await insertOrganization({
		sql,
		name: `E2E Worker ${workerIndex} A`,
		slug: orgASlug,
	});
	const orgBId = await insertOrganization({
		sql,
		name: `E2E Worker ${workerIndex} B`,
		slug: orgBSlug,
	});

	const operatorEmail = `${prefix}-operator@afenda-lite.test`;
	const clientEmail = `${prefix}-client@afenda-lite.test`;
	const foreignEmail = `${prefix}-foreign@afenda-lite.test`;
	const inviteeEmail = `${prefix}-invitee@afenda-lite.test`;

	const operatorId = await insertUser({
		sql,
		email: operatorEmail,
		name: `E2E Operator w${workerIndex}`,
		userRole: "admin",
	});
	const clientId = await insertUser({
		sql,
		email: clientEmail,
		name: `E2E Client w${workerIndex}`,
		userRole: "user",
	});
	const foreignId = await insertUser({
		sql,
		email: foreignEmail,
		name: `E2E Foreign w${workerIndex}`,
		userRole: "admin",
	});
	const inviteeId = await insertUser({
		sql,
		email: inviteeEmail,
		name: `E2E Invitee w${workerIndex}`,
		userRole: "user",
	});

	await insertCredentialAccount({
		sql,
		userId: operatorId,
		passwordHash,
	});
	await insertCredentialAccount({
		sql,
		userId: clientId,
		passwordHash,
	});
	await insertCredentialAccount({
		sql,
		userId: foreignId,
		passwordHash,
	});
	await insertCredentialAccount({
		sql,
		userId: inviteeId,
		passwordHash,
	});

	await insertMember({
		sql,
		organizationId: orgAId,
		userId: operatorId,
		role: "owner",
	});
	await insertMember({
		sql,
		organizationId: orgAId,
		userId: clientId,
		role: "member",
	});
	await insertMember({
		sql,
		organizationId: orgBId,
		userId: foreignId,
		role: "owner",
	});

	return {
		workerIndex,
		runId,
		orgA: { id: orgAId, slug: orgASlug, name: `E2E Worker ${workerIndex} A` },
		orgB: { id: orgBId, slug: orgBSlug, name: `E2E Worker ${workerIndex} B` },
		operator: { email: operatorEmail, password, userId: operatorId },
		client: { email: clientEmail, password, userId: clientId },
		foreignOwner: { email: foreignEmail, password, userId: foreignId },
		invitee: { email: inviteeEmail, password, userId: inviteeId },
	};
}

/**
 * Assign system template `editor` to the factory operator in orgA.
 * Editor has `clients.invite` (shows Operator admin nav) but not `fft.access`
 * (hides FFT nav) and disables admin permission bootstrap.
 */
export async function assignLimitedOperatorNavRole(
	handle: WorkerTenantHandle,
): Promise<{ assignmentId: string; roleId: string }> {
	const databaseUrl = requireDatabaseUrl();
	const sql = await createNeonSql(databaseUrl);

	await sql`
		DELETE FROM platform_role_assignment
		WHERE user_id = ${handle.operator.userId}
			AND organization_id = ${handle.orgA.id}
	`;

	const roles = (await sql`
		SELECT id
		FROM platform_role
		WHERE template_key = 'editor'
			AND is_system_template = true
			AND organization_id IS NULL
		LIMIT 1
	`) as Array<{ id: string }>;

	const roleId = roles[0]?.id;
	if (!roleId) {
		throw new Error(
			"N16 factory: system template role editor missing — run permission catalog seed",
		);
	}

	const inserted = (await sql`
		INSERT INTO platform_role_assignment (
			user_id,
			organization_id,
			role_id,
			scope_type,
			scope_id,
			active,
			granted_by,
			created_at,
			updated_at
		)
		VALUES (
			${handle.operator.userId},
			${handle.orgA.id},
			${roleId}::uuid,
			'organization',
			${handle.orgA.id},
			true,
			${handle.operator.userId},
			NOW(),
			NOW()
		)
		RETURNING id
	`) as Array<{ id: string }>;

	const assignmentId = inserted[0]?.id;
	if (!assignmentId) {
		throw new Error("N16 factory: failed to insert limited operator assignment");
	}

	return { assignmentId, roleId };
}

/** Restore admin-bootstrap path: zero active platform assignments for operator. */
export async function clearOperatorPlatformAssignments(
	handle: WorkerTenantHandle,
): Promise<void> {
	const databaseUrl = requireDatabaseUrl();
	const sql = await createNeonSql(databaseUrl);
	await sql`
		DELETE FROM platform_role_assignment
		WHERE user_id = ${handle.operator.userId}
			AND organization_id = ${handle.orgA.id}
	`;
}

/** Idempotent cleanup of rows created by `provisionWorkerTenant`. */
export async function cleanupWorkerTenant(
	handle: WorkerTenantHandle,
): Promise<void> {
	const databaseUrl = process.env.DATABASE_URL?.trim();
	if (!databaseUrl) {
		return;
	}

	const sql = await createNeonSql(databaseUrl);
	const userIds = [
		handle.operator.userId,
		handle.client.userId,
		handle.foreignOwner.userId,
		handle.invitee.userId,
	];
	const orgIds = [handle.orgA.id, handle.orgB.id];
	const emails = [
		handle.operator.email,
		handle.client.email,
		handle.foreignOwner.email,
		handle.invitee.email,
	];

	for (const userId of userIds) {
		await sql`
			DELETE FROM platform_role_assignment
			WHERE user_id = ${userId}
		`;
	}

	for (const orgId of orgIds) {
		await sql`
			DELETE FROM platform_role_assignment
			WHERE organization_id = ${orgId}
		`;
	}

	for (const userId of userIds) {
		await sql`
			DELETE FROM neon_auth.session
			WHERE "userId" = ${userId}::uuid
		`;
	}

	for (const email of emails) {
		await sql`
			DELETE FROM neon_auth.invitation
			WHERE email = ${email}
		`;
	}

	for (const orgId of orgIds) {
		await sql`
			DELETE FROM neon_auth.invitation
			WHERE "organizationId" = ${orgId}::uuid
		`;
		await sql`
			DELETE FROM neon_auth.member
			WHERE "organizationId" = ${orgId}::uuid
		`;
	}

	for (const userId of userIds) {
		await sql`
			DELETE FROM neon_auth.member
			WHERE "userId" = ${userId}::uuid
		`;
		await sql`
			DELETE FROM neon_auth.account
			WHERE "userId" = ${userId}::uuid
		`;
		await sql`
			DELETE FROM neon_auth."user"
			WHERE id = ${userId}::uuid
		`;
	}

	for (const orgId of orgIds) {
		await sql`
			DELETE FROM neon_auth.organization
			WHERE id = ${orgId}::uuid
		`;
	}
}

/**
 * Two-org denial core: actor must have zero membership in the foreign org.
 */
export async function assertCrossTenantDenied(input: {
	actorUserId: string;
	foreignOrgId: string;
}): Promise<void> {
	const databaseUrl = requireDatabaseUrl();
	const sql = await createNeonSql(databaseUrl);
	const rows = (await sql`
		SELECT 1 AS ok
		FROM neon_auth.member
		WHERE "userId" = ${input.actorUserId}::uuid
			AND "organizationId" = ${input.foreignOrgId}::uuid
		LIMIT 1
	`) as Array<{ ok: number }>;

	if (rows[0]) {
		throw new Error(
			`Expected no membership for user ${input.actorUserId} in org ${input.foreignOrgId}`,
		);
	}
}

/** Clear invitee membership + pending invites for a target org (invite/join prep). */
export async function prepareInviteeForOrg(input: {
	inviteeEmail: string;
	organizationId: string;
}): Promise<void> {
	const databaseUrl = requireDatabaseUrl();
	const sql = await createNeonSql(databaseUrl);
	const passwordHash = await readTemplatePasswordHash(
		sql,
		resolveHashTemplateEmail(),
	);

	await sql`
		UPDATE neon_auth.account AS target
		SET
			password = ${passwordHash},
			"updatedAt" = NOW()
		WHERE target."providerId" = 'credential'
			AND target."userId" = (
				SELECT id FROM neon_auth."user" WHERE email = ${input.inviteeEmail}
			)
	`;

	await sql`
		DELETE FROM neon_auth.member
		WHERE "organizationId" = ${input.organizationId}::uuid
			AND "userId" = (
				SELECT id FROM neon_auth."user" WHERE email = ${input.inviteeEmail}
			)
	`;

	await sql`
		DELETE FROM neon_auth.invitation
		WHERE email = ${input.inviteeEmail}
			AND status = 'pending'
	`;
}

/** Post-accept proof for any org (N8 + N13 factory path). */
export async function assertInviteAccepted(input: {
	inviteeEmail: string;
	invitationId: string;
	organizationId: string;
}): Promise<void> {
	const databaseUrl = requireDatabaseUrl();
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
			AND m."organizationId" = ${input.organizationId}::uuid
		LIMIT 1
	`) as Array<{ ok: number }>;

	if (!members[0]) {
		throw new Error(
			`Expected membership for ${input.inviteeEmail} in org ${input.organizationId} after accept`,
		);
	}
}
