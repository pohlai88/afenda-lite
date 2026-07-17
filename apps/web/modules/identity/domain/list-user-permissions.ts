import {
	and,
	db,
	eq,
	platformRoleAssignment,
	platformRolePermission,
} from "@afenda/db";

import { requireTrimmed } from "@/modules/platform/domain/require-trimmed";

/**
 * Identity — distinct Tier-2 permission codes for a user in one org via
 * active assignments → role permissions (ARCH-023 · N10). Hard
 * `organization_id = $org` only.
 */
export async function listUserPermissions(
	orgId: string,
	userId: string,
): Promise<string[]> {
	const scopedOrgId = requireTrimmed(orgId, "orgId", "listUserPermissions");
	const scopedUserId = requireTrimmed(userId, "userId", "listUserPermissions");

	const rows = await db
		.selectDistinct({ code: platformRolePermission.permissionCode })
		.from(platformRoleAssignment)
		.innerJoin(
			platformRolePermission,
			eq(platformRolePermission.roleId, platformRoleAssignment.roleId),
		)
		.where(
			and(
				eq(platformRoleAssignment.organizationId, scopedOrgId),
				eq(platformRoleAssignment.userId, scopedUserId),
				eq(platformRoleAssignment.active, true),
			),
		);

	return rows.map((row) => row.code).sort((a, b) => a.localeCompare(b));
}
