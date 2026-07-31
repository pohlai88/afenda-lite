import type { platformRoleAssignment } from "@afenda/db";
import type { ResultFailure } from "@afenda/errors";

import type { AssignOrgRoleCommand } from "@/modules/identity/schemas/assign-org-role";

export const ORGANIZATION_SCOPE = "organization" as const;

export type AssignOrgRoleInput = AssignOrgRoleCommand & {
	orgId: string;
	grantedBy: string;
};

export interface AssignOrgRoleOk {
	assignment: typeof platformRoleAssignment.$inferSelect;
	ok: true;
	reactivated: boolean;
}

export type AssignOrgRoleErr = ResultFailure;

export type AssignOrgRoleResult = AssignOrgRoleOk | AssignOrgRoleErr;

/**
 * Product mutate lives in `assign-org-role-audited.ts` (`assignOrgRoleWithAudit`).
 * Non-audited `assignOrgRole` was retired (N12 Path-to-100%).
 */
