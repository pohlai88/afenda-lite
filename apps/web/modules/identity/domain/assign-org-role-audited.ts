/** Application composition adapter for the canonical admin RBAC transaction. */

import {
	type AssignRoleWithAuditCommand,
	type AssignRoleWithAuditResult,
	rbacAudit,
} from "@afenda/admin/audit";

export type AssignOrgRoleWithAuditInput = AssignRoleWithAuditCommand;
export type AssignOrgRoleWithAuditResult = AssignRoleWithAuditResult;
export type AssignOrgRoleWithAuditOk = Extract<
	AssignRoleWithAuditResult,
	{ ok: true }
>;

export async function assignOrgRoleWithAudit(
	input: AssignOrgRoleWithAuditInput,
): Promise<AssignOrgRoleWithAuditResult> {
	return await rbacAudit.roles.assign(input);
}
