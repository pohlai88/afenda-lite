import {
	createOrganization as createNeonOrganization,
	deleteOrganization as deleteNeonOrganization,
	inviteOrgMember,
	listMemberOrganizations,
	persistActiveOrganization,
} from "@afenda/auth";
import {
	database as afendaDatabase,
	inArray,
	max,
	platformRbacAudit,
} from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";

import {
	type CreatedOrganization,
	createdOrganizationSchema,
	createOrganizationInputSchema,
	type DeletedOrganization,
	deletedOrganizationSchema,
	deleteOrganizationInputSchema,
	type OrganizationSummary,
	organizationSummarySchema,
	type ProvisionOrganizationResult,
	provisionOrganizationInputSchema,
	provisionOrganizationResultSchema,
} from "./schemas/org";

function failFromPersistence(error: unknown, _fallbackMessage: string) {
	return errorProject.result(
		errorIngress.postgres(error, { operation: "persistence.postgres" }),
	);
}

async function loadLastActivityByOrgId(
	orgIds: readonly string[],
): Promise<Map<string, Date>> {
	const activity = new Map<string, Date>();
	if (orgIds.length === 0) {
		return activity;
	}

	const rows = await afendaDatabase.client
		.select({
			organizationId: platformRbacAudit.organizationId,
			lastActivityAt: max(platformRbacAudit.createdAt),
		})
		.from(platformRbacAudit)
		.where(inArray(platformRbacAudit.organizationId, [...orgIds]))
		.groupBy(platformRbacAudit.organizationId);

	for (const row of rows) {
		if (row.lastActivityAt instanceof Date) {
			activity.set(row.organizationId, row.lastActivityAt);
		}
	}
	return activity;
}

/**
 * List Neon Auth organizations for the active session (org-console).
 * Enriches each row with `lastActivityAt` from `platform_rbac_audit` (real max).
 */
export async function listOrganizations(): Promise<
	Result<OrganizationSummary[]>
> {
	try {
		const listed = await listMemberOrganizations();
		if (!listed.ok) {
			return listed;
		}
		const lastActivityByOrgId = await loadLastActivityByOrgId(
			listed.data.map((row) => row.id),
		);
		const parsed = listed.data.map((row) =>
			organizationSummarySchema.parse({
				id: row.id,
				slug: row.slug,
				lastActivityAt: lastActivityByOrgId.get(row.id) ?? null,
			}),
		);
		return errorResult.ok(parsed);
	} catch (error) {
		return failFromPersistence(error, "Failed to list organizations");
	}
}

/**
 * Create an organization via Neon Auth (session user becomes owner).
 */
export async function createOrganization(
	input: unknown,
): Promise<Result<CreatedOrganization>> {
	const parsedInput = createOrganizationInputSchema.safeParse(input);
	if (!parsedInput.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Invalid organization create input",
		});
	}

	const created = await createNeonOrganization(parsedInput.data);
	if (!created.ok) {
		return created;
	}
	return errorResult.ok(createdOrganizationSchema.parse(created.data));
}

/**
 * Offboard an organization via Neon Auth hard-delete (`organization.delete`).
 * Not a local soft-active flag — members and invitations for that org are removed.
 */
export async function deleteOrganization(
	input: unknown,
): Promise<Result<DeletedOrganization>> {
	const parsedInput = deleteOrganizationInputSchema.safeParse(input);
	if (!parsedInput.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Invalid organization delete input",
		});
	}

	const deleted = await deleteNeonOrganization(parsedInput.data.orgId);
	if (!deleted.ok) {
		return deleted;
	}
	return errorResult.ok(
		deletedOrganizationSchema.parse({ orgId: parsedInput.data.orgId }),
	);
}

/**
 * Create an organization, switch the session active org, then invite the first admin.
 * No local `user.create`. Invite never runs without a successful active-org persist
 * (`inviteOrgMember` refuses non-active org).
 *
 * A downstream failure is normalized to the canonical error facade. The
 * organization remains created; recovery is an operational workflow concern.
 */
export async function provisionOrganization(
	input: unknown,
): Promise<Result<ProvisionOrganizationResult>> {
	const parsedInput = provisionOrganizationInputSchema.safeParse(input);
	if (!parsedInput.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Invalid organization provision input",
		});
	}

	const command = parsedInput.data;

	const created = await createNeonOrganization({
		name: command.name,
		slug: command.slug,
	});
	if (!created.ok) {
		return created;
	}
	const organization = createdOrganizationSchema.parse(created.data);

	const persisted = await persistActiveOrganization(organization.id);
	if (!persisted.ok) {
		return errorResult.fail("INTERNAL_ERROR");
	}

	const invited = await inviteOrgMember({
		email: command.adminEmail,
		orgId: organization.id,
		role: command.adminRole,
	});
	if (!invited.ok) {
		return errorResult.fail("INTERNAL_ERROR");
	}

	return errorResult.ok(
		provisionOrganizationResultSchema.parse({
			organization,
			invitationId: invited.data.invitationId,
		}),
	);
}
