import type { Session } from "@afenda/auth";

import {
	PERMISSION_DENIED_MESSAGE,
	type ProductPermissionCode,
	sessionHasPermission,
} from "@/modules/identity/domain/session-permission";
import {
	type ActionFailure,
	actionFail,
} from "@/modules/platform/schemas/action-result";

/**
 * Shared Server Action denial adapter. `null` is the allow result; expected
 * denials use the governed API-002 `FORBIDDEN` failure shape.
 */
export async function forbidUnlessPermission(
	session: Session,
	code: ProductPermissionCode,
): Promise<ActionFailure | null> {
	const allowed = await sessionHasPermission(session, code);
	return allowed
		? null
		: actionFail("FORBIDDEN", PERMISSION_DENIED_MESSAGE[code]);
}
