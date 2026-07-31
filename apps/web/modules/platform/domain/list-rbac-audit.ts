import { rbacAudit } from "@afenda/admin/audit";
import { errorIngress } from "@afenda/errors";

/**
 * Platform — org-scoped RBAC audit rows (hard `organization_id = $orgId`).
 * Governance/audit surface; product RBAC assignments/roles stay in Identity.
 */
export async function listOrgRbacAudit(orgId: string) {
	const result = await rbacAudit.read.list({ orgId });
	if (!result.ok) {
		throw errorIngress.code("INTERNAL_ERROR", {
			operation: "admin.rbac-audit.list",
		});
	}
	return result.data.rows;
}
