import type { PlatformPermissionCodeV1 } from "@afenda/db";

import {
	hasPermission,
	type PermissionBootstrapRole,
} from "@/modules/identity/domain/has-permission";

export type ProductPermissionCode = PlatformPermissionCodeV1;

export type PermissionSession = {
	orgId: string;
	userId: string;
	role: PermissionBootstrapRole;
};

export const PERMISSION_DENIED_MESSAGE = {
	"org.users.manage":
		"You do not have permission to manage organization users.",
	"org.roles.manage":
		"You do not have permission to manage organization roles.",
	"clients.invite": "You do not have permission to invite members.",
	"account.self": "You do not have permission to manage this account.",
	"master_data.read":
		"You do not have permission to read organization master data.",
	"master_data.manage":
		"You do not have permission to manage organization master data.",
	"master_data.approve":
		"You do not have permission to approve master-data change requests.",
	"master_data.import_approve":
		"You do not have permission to approve and apply master-data import.",
	"sales.read": "You do not have permission to read sales orders.",
	"sales.manage": "You do not have permission to manage sales orders.",
	"purchasing.read": "You do not have permission to read purchase orders.",
	"purchasing.manage": "You do not have permission to manage purchase orders.",
} as const satisfies Record<PlatformPermissionCodeV1, string>;

/**
 * Binds the N10 permission kernel to the authenticated session organization.
 * Product ports supply only a governed ARCH-023 v1 permission code.
 */
export function sessionHasPermission(
	session: PermissionSession,
	code: ProductPermissionCode,
): Promise<boolean> {
	return hasPermission({
		orgId: session.orgId,
		userId: session.userId,
		code,
		bootstrapRole: session.role,
	});
}
