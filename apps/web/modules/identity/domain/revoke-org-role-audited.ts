/** Application composition adapter for the canonical admin RBAC transaction. */

import {
	type RevokeRoleWithAuditCommand,
	type RevokeRoleWithAuditResult,
	rbacAudit,
} from "@afenda/admin/audit";

export type RevokeOrgRoleWithAuditInput = RevokeRoleWithAuditCommand;
export type RevokeOrgRoleWithAuditResult = RevokeRoleWithAuditResult;
export type RevokeOrgRoleWithAuditOk = Extract<
	RevokeRoleWithAuditResult,
	{ ok: true }
>;

export async function revokeOrgRoleWithAudit(
	input: RevokeOrgRoleWithAuditInput,
): Promise<RevokeOrgRoleWithAuditResult> {
	return await rbacAudit.roles.revoke(input);
}
