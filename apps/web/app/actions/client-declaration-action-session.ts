import { type ApiSession, getApiSession, requireRole } from "@afenda/auth";

import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { isClientOnboardingComplete } from "@/modules/declarations/domain/declaration-draft";
import type { ProductPermissionCode } from "@/modules/identity/domain/session-permission";
import {
	type ActionFailure,
	actionFail,
} from "@/modules/platform/schemas/action-result";

/**
 * Shared Server Action gate for client declaration load/save/submit.
 * Mirrors REST `requireClientDraftSession` messages/codes without cross-layer merge.
 */
export async function requireClientDeclarationActionSession(
	permission: ProductPermissionCode,
): Promise<{ ok: true; session: ApiSession } | ActionFailure> {
	await requireRole("client");
	const session = await getApiSession();
	if (!session) {
		return actionFail("UNAUTHORIZED", "Authentication required.");
	}

	const permissionDenied = await forbidUnlessPermission(session, permission);
	if (permissionDenied) {
		return permissionDenied;
	}

	const onboarded = await isClientOnboardingComplete({
		orgId: session.orgId,
		userId: session.userId,
	});
	if (!onboarded) {
		return actionFail("FORBIDDEN", "Complete client onboarding first.");
	}

	return { ok: true, session };
}
