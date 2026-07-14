import { platformRoleAssignment, withOrg } from "@afenda/db";

/**
 * Identity — platform RBAC assignments for an organization.
 * Explicit `orgId`; no ambient org inference (ARCH-023 · ARCH-028 S7.3).
 */
export async function listRoleAssignments(orgId: string) {
	return withOrg(platformRoleAssignment, orgId);
}
