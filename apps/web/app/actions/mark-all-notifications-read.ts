"use server";

import type { Result as ActionResult } from "@afenda/errors";
import { notifications } from "@afenda/notifications";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runMemberSessionAction } from "@/app/actions/run-member-session-action";

export interface MarkAllNotificationsReadActionData {
	marked: number;
}

/** `null` = form idle (`useActionState`); otherwise API-002 `ActionResult`. */
export type MarkAllNotificationsReadActionState =
	ActionResult<MarkAllNotificationsReadActionData> | null;

/**
 * Mark all current-member inbox items read — session stamps org + user.
 */
export async function markAllNotificationsReadAction(
	_prev: MarkAllNotificationsReadActionState,
	_formData: FormData,
): Promise<MarkAllNotificationsReadActionState> {
	return await runMemberSessionAction({
		path: "markAllNotificationsReadAction",
		safeMessage:
			"Could not mark notifications read. Try again or contact an admin.",
		execute: async (session) => {
			const result = await notifications.inbox.markAllRead({
				organizationId: session.orgId,
				userId: session.userId,
			});
			if (!result.ok) {
				return mapPackageResult(result);
			}
			return mapPackageResult({
				ok: true,
				data: { marked: result.data },
			});
		},
	});
}
