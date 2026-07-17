import type { platformRoleAssignment } from "@afenda/db";

import type { AssignOrgRoleCommand } from "@/modules/identity/schemas/assign-org-role";

export {
	type AssignOrgRoleCommand,
	assignOrgRoleCommandSchema,
	parseAssignOrgRoleCommand,
} from "@/modules/identity/schemas/assign-org-role";

export const ORGANIZATION_SCOPE = "organization" as const;

export type AssignOrgRoleInput = AssignOrgRoleCommand & {
	orgId: string;
	grantedBy: string;
};

export type AssignOrgRoleOk = {
	ok: true;
	assignment: typeof platformRoleAssignment.$inferSelect;
	reactivated: boolean;
};

export type AssignOrgRoleErr = {
	ok: false;
	code: "NOT_FOUND" | "CONFLICT" | "BAD_REQUEST";
	message: string;
};

export type AssignOrgRoleResult = AssignOrgRoleOk | AssignOrgRoleErr;

/**
 * Product mutate lives in `assign-org-role-audited.ts` (`assignOrgRoleWithAudit`).
 * Non-audited `assignOrgRole` was retired (N12 Path-to-100%).
 */
