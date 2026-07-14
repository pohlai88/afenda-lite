import { platformRole, withOrg } from "@afenda/db";

/**
 * Identity — org-scoped platform RBAC roles (excludes NULL-org system templates).
 * ARCH-009 / ARCH-023: platform RBAC domain lives in Identity, not Platform.
 */
export async function listOrgRoles(orgId: string) {
	return withOrg(platformRole, orgId);
}
