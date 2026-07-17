import { AUTH_FORBIDDEN_PATH, type Session } from "@afenda/auth";
import { redirect } from "next/navigation";

import {
	type ProductPermissionCode,
	sessionHasPermission,
} from "@/modules/identity/domain/session-permission";

export function forbidPermissionAccess(): never {
	redirect(AUTH_FORBIDDEN_PATH);
}

/**
 * Fail-closed Tier-2 RSC gate. Coarse route-role layouts remain the first
 * shell; this helper enforces the product permission at the read port.
 */
export async function requirePermission(
	session: Session,
	code: ProductPermissionCode,
): Promise<void> {
	if (!(await sessionHasPermission(session, code))) {
		forbidPermissionAccess();
	}
}
