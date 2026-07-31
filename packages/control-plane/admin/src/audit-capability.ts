import { deleteRbacAuditRow, listRbacAudit, recordRbacAudit } from "./audit";
import { assignRoleWithAudit, revokeRoleWithAudit } from "./role-assignment";
import {
	DEFAULT_RBAC_AUDIT_PAGE,
	DEFAULT_RBAC_AUDIT_PAGE_SIZE,
	deleteRbacAuditInputSchema,
	listRbacAuditInputSchema,
	MAX_RBAC_AUDIT_IP_ADDRESS_LENGTH,
	MAX_RBAC_AUDIT_PAGE_SIZE,
	MAX_RBAC_AUDIT_USER_AGENT_LENGTH,
	MEMBER_INVITE_AUDIT_ACTION,
	ROLE_ASSIGN_AUDIT_ACTION,
	ROLE_REVOKE_AUDIT_ACTION,
	rbacAuditPageSchema,
	rbacAuditRowSchema,
	recordRbacAuditCommandSchema,
} from "./schemas/audit";

const actions = Object.freeze({
	memberInvite: MEMBER_INVITE_AUDIT_ACTION,
	roleAssign: ROLE_ASSIGN_AUDIT_ACTION,
	roleRevoke: ROLE_REVOKE_AUDIT_ACTION,
});

const limits = Object.freeze({
	ipAddressLength: MAX_RBAC_AUDIT_IP_ADDRESS_LENGTH,
	page: DEFAULT_RBAC_AUDIT_PAGE,
	pageSize: DEFAULT_RBAC_AUDIT_PAGE_SIZE,
	pageSizeMaximum: MAX_RBAC_AUDIT_PAGE_SIZE,
	userAgentLength: MAX_RBAC_AUDIT_USER_AGENT_LENGTH,
});

const schemas = Object.freeze({
	delete: deleteRbacAuditInputSchema,
	list: listRbacAuditInputSchema,
	page: rbacAuditPageSchema,
	record: recordRbacAuditCommandSchema,
	row: rbacAuditRowSchema,
});

/** Isolated RBAC-audit capability; never loads the Neon Auth client. */
export const rbacAudit = Object.freeze({
	actions,
	limits,
	read: Object.freeze({ list: listRbacAudit }),
	record: recordRbacAudit,
	roles: Object.freeze({
		assign: assignRoleWithAudit,
		revoke: revokeRoleWithAudit,
	}),
	rows: Object.freeze({ delete: deleteRbacAuditRow }),
	schemas,
});

export type RbacAuditCapability = typeof rbacAudit;
