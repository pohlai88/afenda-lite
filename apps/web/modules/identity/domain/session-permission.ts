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
	"declarations.manage": "You do not have permission to manage declarations.",
	"declarations.read": "You do not have permission to read declarations.",
	"clients.invite": "You do not have permission to invite members.",
	"account.self": "You do not have permission to manage this account.",
	"fft.access": "You do not have permission to access Feed Farm Trade.",
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
