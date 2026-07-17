import type { platformRoleAssignment } from "@afenda/db";

export {
	parseRevokeOrgRoleCommand,
	type RevokeOrgRoleCommand,
	revokeOrgRoleCommandSchema,
} from "@/modules/identity/schemas/revoke-org-role";

export type RevokeOrgRoleInput = {
	orgId: string;
	assignmentId: string;
};

export type RevokeOrgRoleOk = {
	ok: true;
	assignment: typeof platformRoleAssignment.$inferSelect;
};

export type RevokeOrgRoleErr = {
	ok: false;
	code: "NOT_FOUND";
	message: string;
};

export type RevokeOrgRoleResult = RevokeOrgRoleOk | RevokeOrgRoleErr;

/**
 * Product mutate lives in `revoke-org-role-audited.ts` (`revokeOrgRoleWithAudit`).
 * Non-audited `revokeOrgRole` was retired (N12 Path-to-100%).
 */
