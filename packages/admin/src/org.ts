import {
	createOrganization as createNeonOrganization,
	deleteOrganization as deleteNeonOrganization,
	inviteOrgMember,
	listMemberOrganizations,
	persistActiveOrganization,
} from "@afenda/auth";
import { db, inArray, max, platformRbacAudit } from "@afenda/db";
import { fail, failFromUnknown, ok, type Result } from "@afenda/errors/result";

import {
	type CreatedOrganization,
	createdOrganizationSchema,
	createOrganizationInputSchema,
	type DeletedOrganization,
	deletedOrganizationSchema,
	deleteOrganizationInputSchema,
	type OrganizationSummary,
	organizationSummarySchema,
	PROVISION_ORG_CREATED_INVITE_FAILED,
	PROVISION_ORG_CREATED_SET_ACTIVE_FAILED,
	type ProvisionOrganizationResult,
	provisionOrganizationInputSchema,
	provisionOrganizationResultSchema,
} from "./schemas/org";

async function loadLastActivityByOrgId(
	orgIds: readonly string[],
): Promise<Map<string, Date>> {
	const activity = new Map<string, Date>();
	if (orgIds.length === 0) {
		return activity;
	}

	const rows = await db
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
		return ok(parsed);
	} catch (error) {
		return failFromUnknown(error, "Failed to list organizations");
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
		return fail("BAD_REQUEST", "Invalid organization create input", {
			fieldErrors: parsedInput.error.flatten().fieldErrors,
		});
	}

	const created = await createNeonOrganization(parsedInput.data);
	if (!created.ok) {
		return created;
	}
	return ok(createdOrganizationSchema.parse(created.data));
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
		return fail("BAD_REQUEST", "Invalid organization delete input", {
			fieldErrors: parsedInput.error.flatten().fieldErrors,
		});
	}

	const deleted = await deleteNeonOrganization(parsedInput.data.orgId);
	if (!deleted.ok) {
		return deleted;
	}
	return ok(deletedOrganizationSchema.parse({ orgId: parsedInput.data.orgId }));
}

/**
 * Create an organization, switch the session active org, then invite the first admin.
 * No local `user.create`. Invite never runs without a successful active-org persist
 * (`inviteOrgMember` refuses non-active org).
 *
 * On invite (or setActive) failure after create: returns `ok:false` with
 * `details.organization` + disposition — org is left for retry invite (no fake rollback).
 */
export async function provisionOrganization(
	input: unknown,
): Promise<Result<ProvisionOrganizationResult>> {
	const parsedInput = provisionOrganizationInputSchema.safeParse(input);
	if (!parsedInput.success) {
		return fail("BAD_REQUEST", "Invalid organization provision input", {
			fieldErrors: parsedInput.error.flatten().fieldErrors,
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
		return fail(
			"INTERNAL_ERROR",
			"Organization created; active org switch failed — set active then retry invite",
			{
				disposition: PROVISION_ORG_CREATED_SET_ACTIVE_FAILED,
				organization,
			},
		);
	}

	const invited = await inviteOrgMember({
		email: command.adminEmail,
		orgId: organization.id,
		role: command.adminRole,
	});
	if (!invited.ok) {
		return fail(
			"INTERNAL_ERROR",
			"Organization created; invite failed — retry invite",
			{
				disposition: PROVISION_ORG_CREATED_INVITE_FAILED,
				organization,
			},
		);
	}

	return ok(
		provisionOrganizationResultSchema.parse({
			organization,
			invitationId: invited.data.invitationId,
		}),
	);
}
