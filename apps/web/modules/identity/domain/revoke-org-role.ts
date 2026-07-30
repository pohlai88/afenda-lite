import type { platformRoleAssignment } from "@afenda/db";
import type { ResultFailure } from "@afenda/errors/result";

export interface RevokeOrgRoleInput {
	assignmentId: string;
	orgId: string;
}

export interface RevokeOrgRoleOk {
	assignment: typeof platformRoleAssignment.$inferSelect;
	ok: true;
}

export type RevokeOrgRoleErr = ResultFailure;

export type RevokeOrgRoleResult = RevokeOrgRoleOk | RevokeOrgRoleErr;

/**
 * Product mutate lives in `revoke-org-role-audited.ts` (`revokeOrgRoleWithAudit`).
 * Non-audited `revokeOrgRole` was retired (N12 Path-to-100%).
 */
