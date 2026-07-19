"use server";

import { countUnreadNotifications } from "@afenda/notifications";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runMemberSessionAction } from "@/app/actions/run-member-session-action";
import type { ActionResult } from "@/modules/platform/schemas/action-result";

export type GetUnreadNotificationCountActionData = {
	unreadCount: number;
};

/** `null` = form idle (`useActionState`); otherwise API-002 `ActionResult`. */
export type GetUnreadNotificationCountActionState =
	ActionResult<GetUnreadNotificationCountActionData> | null;

/**
 * Current-member unread inbox count — session stamps org + user.
 */
export async function getUnreadNotificationCountAction(
	_prev: GetUnreadNotificationCountActionState,
	_formData: FormData,
): Promise<GetUnreadNotificationCountActionState> {
	return runMemberSessionAction({
		path: "getUnreadNotificationCountAction",
		safeMessage: "Could not load unread count. Try again or contact an admin.",
		execute: async (session) => {
			const result = await countUnreadNotifications({
				organizationId: session.orgId,
				userId: session.userId,
			});
			if (!result.ok) {
				return mapPackageResult(result);
			}
			return mapPackageResult({
				ok: true,
				data: { unreadCount: result.data },
			});
		},
	});
}
