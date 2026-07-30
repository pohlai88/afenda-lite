import { platformRbacAudit, withOrg } from "@afenda/db";

/**
 * Platform — org-scoped RBAC audit rows (hard `organization_id = $orgId`).
 * Governance/audit surface; product RBAC assignments/roles stay in Identity.
 */
export async function listOrgRbacAudit(orgId: string) {
	return await withOrg(platformRbacAudit, orgId);
}
