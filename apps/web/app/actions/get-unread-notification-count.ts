"use server";

import type { Result as ActionResult } from "@afenda/errors";
import { notifications } from "@afenda/notifications";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runMemberSessionAction } from "@/app/actions/_runtime/run-member-session-action";

export interface GetUnreadNotificationCountActionData {
	unreadCount: number;
}

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
	return await runMemberSessionAction({
		path: "getUnreadNotificationCountAction",
		safeMessage: "Could not load unread count. Try again or contact an admin.",
		execute: async (session) => {
			const result = await notifications.inbox.countUnread({
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
