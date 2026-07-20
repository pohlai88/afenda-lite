import {
	PERMISSION_DENIED_MESSAGE,
	type PermissionSession,
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
	session: PermissionSession,
	code: ProductPermissionCode,
): Promise<ActionFailure | null> {
	const allowed = await sessionHasPermission(session, code);
	if (allowed) return null;
	const message = PERMISSION_DENIED_MESSAGE[code];
	if (message === undefined) {
		throw new Error(`Missing denial message for permission ${code}`);
	}
	return actionFail("FORBIDDEN", message);
}
