import {
	and,
	db,
	eq,
	isNull,
	platformRole,
	platformRoleAssignment,
} from "@afenda/db";

import type { AssignOrgRoleCommand } from "@/modules/identity/schemas/assign-org-role";

export {
	type AssignOrgRoleCommand,
	assignOrgRoleCommandSchema,
	parseAssignOrgRoleCommand,
} from "@/modules/identity/schemas/assign-org-role";

export const ORGANIZATION_SCOPE = "organization" as const;

export type AssignOrgRoleInput = AssignOrgRoleCommand & {
	orgId: string;
	grantedBy: string;
};

export type AssignOrgRoleOk = {
	ok: true;
	assignment: typeof platformRoleAssignment.$inferSelect;
	reactivated: boolean;
};

export type AssignOrgRoleErr = {
	ok: false;
	code: "NOT_FOUND" | "CONFLICT" | "BAD_REQUEST";
	message: string;
};

export type AssignOrgRoleResult = AssignOrgRoleOk | AssignOrgRoleErr;

function requireTrimmed(value: string, field: string, context: string): string {
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		throw new Error(`${context} requires non-empty ${field}`);
	}
	return trimmed;
}

async function findAssignableRole(roleId: string, orgId: string) {
	const [template] = await db
		.select()
		.from(platformRole)
		.where(
			and(
				eq(platformRole.id, roleId),
				eq(platformRole.active, true),
				eq(platformRole.isSystemTemplate, true),
				isNull(platformRole.organizationId),
			),
		)
		.limit(1);

	if (template) {
		return template;
	}

	const [orgRole] = await db
		.select()
		.from(platformRole)
		.where(
			and(
				eq(platformRole.id, roleId),
				eq(platformRole.active, true),
				eq(platformRole.organizationId, orgId),
			),
		)
		.limit(1);

	return orgRole ?? null;
}

/**
 * Identity — assign a platform role to a user under hard org stamp
 * (GUIDE-018 I3.1 · ARCH-023). Idempotent reactivate of inactive row;
 * CONFLICT when already active.
 */
export async function assignOrgRole(
	input: AssignOrgRoleInput,
): Promise<AssignOrgRoleResult> {
	const orgId = requireTrimmed(input.orgId, "orgId", "assignOrgRole");
	const userId = requireTrimmed(input.userId, "userId", "assignOrgRole");
	const grantedBy = requireTrimmed(
		input.grantedBy,
		"grantedBy",
		"assignOrgRole",
	);
	const roleId = requireTrimmed(input.roleId, "roleId", "assignOrgRole");

	const role = await findAssignableRole(roleId, orgId);
	if (!role) {
		return {
			ok: false,
			code: "NOT_FOUND",
			message: "That role is not assignable in this organization.",
		};
	}

	const existing = await db
		.select()
		.from(platformRoleAssignment)
		.where(
			and(
				eq(platformRoleAssignment.organizationId, orgId),
				eq(platformRoleAssignment.userId, userId),
				eq(platformRoleAssignment.roleId, roleId),
				eq(platformRoleAssignment.scopeType, ORGANIZATION_SCOPE),
				eq(platformRoleAssignment.scopeId, orgId),
			),
		)
		.limit(1);

	const current = existing[0];
	if (current?.active) {
		return {
			ok: false,
			code: "CONFLICT",
			message: "That role is already assigned to this user.",
		};
	}

	if (current && !current.active) {
		const [reactivated] = await db
			.update(platformRoleAssignment)
			.set({
				active: true,
				grantedBy,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(platformRoleAssignment.id, current.id),
					eq(platformRoleAssignment.organizationId, orgId),
				),
			)
			.returning();

		if (!reactivated) {
			return {
				ok: false,
				code: "BAD_REQUEST",
				message: "Assignment could not be reactivated.",
			};
		}

		return { ok: true, assignment: reactivated, reactivated: true };
	}

	const [inserted] = await db
		.insert(platformRoleAssignment)
		.values({
			userId,
			organizationId: orgId,
			roleId,
			scopeType: ORGANIZATION_SCOPE,
			/** DB check: organization scope requires non-null scope_id (= org). */
			scopeId: orgId,
			active: true,
			grantedBy,
		})
		.returning();

	if (!inserted) {
		return {
			ok: false,
			code: "BAD_REQUEST",
			message: "Assignment could not be created.",
		};
	}

	return { ok: true, assignment: inserted, reactivated: false };
}
