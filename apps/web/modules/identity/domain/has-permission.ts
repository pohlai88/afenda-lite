import {
	and,
	db,
	eq,
	isPlatformPermissionCodeV1,
	platformRoleAssignment,
	platformRolePermission,
} from "@afenda/db";

/** Coarse shell role used only for unassigned admin bootstrap (ARCH-023). */
export type PermissionBootstrapRole = "admin" | "operator" | "client";

export type HasPermissionInput = {
	orgId: string;
	userId: string;
	/** ARCH-023 Tier-2 permission code (never role display names). */
	code: string;
	/**
	 * Coarse session role for bootstrap only when the actor has zero active
	 * platform assignments in the org (ARCH-023 §3.2 #2).
	 */
	bootstrapRole?: PermissionBootstrapRole;
};

function requireTrimmed(value: string, field: string): string {
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		throw new Error(`hasPermission requires non-empty ${field}`);
	}
	return trimmed;
}

/**
 * Identity — Tier-2 permission check via active org assignments → role
 * permissions (GUIDE-018 I3.1 · ARCH-023 · N10). Catalog-gated: unknown codes
 * return false. Does not authorize by Neon role display names except the
 * documented admin bootstrap when unassigned.
 */
export async function hasPermission(
	input: HasPermissionInput,
): Promise<boolean> {
	const orgId = requireTrimmed(input.orgId, "orgId");
	const userId = requireTrimmed(input.userId, "userId");
	const code = requireTrimmed(input.code, "code");

	if (!isPlatformPermissionCodeV1(code)) {
		return false;
	}

	const granted = await db
		.select({ roleId: platformRolePermission.roleId })
		.from(platformRoleAssignment)
		.innerJoin(
			platformRolePermission,
			eq(platformRolePermission.roleId, platformRoleAssignment.roleId),
		)
		.where(
			and(
				eq(platformRoleAssignment.organizationId, orgId),
				eq(platformRoleAssignment.userId, userId),
				eq(platformRoleAssignment.active, true),
				eq(platformRolePermission.permissionCode, code),
			),
		)
		.limit(1);

	if (granted.length > 0) {
		return true;
	}

	const activeAssignments = await db
		.select({ id: platformRoleAssignment.id })
		.from(platformRoleAssignment)
		.where(
			and(
				eq(platformRoleAssignment.organizationId, orgId),
				eq(platformRoleAssignment.userId, userId),
				eq(platformRoleAssignment.active, true),
			),
		)
		.limit(1);

	if (activeAssignments.length > 0) {
		return false;
	}

	return input.bootstrapRole === "admin";
}
