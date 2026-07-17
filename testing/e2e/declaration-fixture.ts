/**
 * N17 — seed a client-owned declaration assignment for Playwright journey.
 * Requires factory worker tenant + permission catalog (editor template).
 */

import { randomUUID } from "node:crypto";

import { createNeonSql } from "./neon-sql";
import type { WorkerTenantHandle } from "./tenancy";

export type DeclarationFixture = {
	assignmentId: string;
	surveyId: string;
	surveyTitle: string;
	orgId: string;
	clientEmail: string;
};

function requireDatabaseUrl(): string {
	const databaseUrl = process.env.DATABASE_URL?.trim();
	if (!databaseUrl) {
		throw new Error("N17 declaration fixture requires DATABASE_URL");
	}
	return databaseUrl;
}

/**
 * Grant editor (declarations.read + declarations.manage), complete onboarding,
 * and insert one owned survey assignment under orgA for the factory client.
 */
export async function seedClientDeclarationFixture(
	handle: WorkerTenantHandle,
): Promise<DeclarationFixture> {
	const sql = await createNeonSql(requireDatabaseUrl());
	const orgId = handle.orgA.id;
	const clientEmail = handle.client.email;
	const clientUserId = handle.client.userId;
	const actorId = handle.operator.userId;
	const surveyId = randomUUID();
	const assignmentId = randomUUID();
	const slug = `n17-e2e-${handle.runId}-${handle.workerIndex}`;
	const surveyTitle = `N17 E2E Declaration w${handle.workerIndex}`;

	await sql`
		DELETE FROM platform_role_assignment
		WHERE user_id = ${clientUserId}
			AND organization_id = ${orgId}
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
			"N17 fixture: system template role editor missing — run permission catalog seed",
		);
	}

	await sql`
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
			${clientUserId},
			${orgId},
			${roleId}::uuid,
			'organization',
			${orgId},
			true,
			${actorId},
			NOW(),
			NOW()
		)
	`;

	await sql`
		INSERT INTO client_profiles (
			user_id,
			organization_id,
			onboarding_complete,
			updated_at,
			account_email
		)
		VALUES (
			${clientUserId}::uuid,
			${orgId},
			true,
			NOW(),
			${clientEmail}
		)
		ON CONFLICT (user_id) DO UPDATE SET
			organization_id = EXCLUDED.organization_id,
			onboarding_complete = true,
			account_email = EXCLUDED.account_email,
			updated_at = NOW()
	`;

	await sql`
		INSERT INTO surveys (
			id,
			slug,
			title,
			question,
			user_id,
			organization_id,
			categories,
			created_at
		)
		VALUES (
			${surveyId}::uuid,
			${slug},
			${surveyTitle},
			'Confirm your declaration response for N17 E2E.',
			${actorId}::uuid,
			${orgId},
			ARRAY[]::text[],
			NOW()
		)
	`;

	await sql`
		INSERT INTO client_assignments (
			id,
			survey_id,
			client_email,
			assigned_by,
			status,
			organization_id,
			created_at
		)
		VALUES (
			${assignmentId}::uuid,
			${surveyId}::uuid,
			${clientEmail},
			${actorId}::uuid,
			'pending',
			${orgId},
			NOW()
		)
	`;

	return {
		assignmentId,
		surveyId,
		surveyTitle,
		orgId,
		clientEmail,
	};
}

/** Delete surveys/assignments/profiles created for the fixture org. */
export async function cleanupClientDeclarationFixture(
	fixture: DeclarationFixture,
): Promise<void> {
	const databaseUrl = process.env.DATABASE_URL?.trim();
	if (!databaseUrl) {
		return;
	}
	const sql = await createNeonSql(databaseUrl);

	await sql`
		DELETE FROM client_assignments
		WHERE id = ${fixture.assignmentId}::uuid
	`;
	await sql`
		DELETE FROM surveys
		WHERE id = ${fixture.surveyId}::uuid
	`;
}
