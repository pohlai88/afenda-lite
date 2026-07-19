"use server";

import { listNotifications, type Notification } from "@afenda/notifications";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runMemberSessionAction } from "@/app/actions/run-member-session-action";
import { listMyNotificationsCommandSchema } from "@/modules/identity/schemas/my-notifications";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type ListMyNotificationsActionData = {
	notifications: Notification[];
};

/** `null` = form idle (`useActionState`); otherwise API-002 `ActionResult`. */
export type ListMyNotificationsActionState =
	ActionResult<ListMyNotificationsActionData> | null;

/**
 * Current-member inbox list — session stamps org + user (never client ids).
 */
export async function listMyNotificationsAction(
	_prev: ListMyNotificationsActionState,
	formData: FormData,
): Promise<ListMyNotificationsActionState> {
	return runMemberSessionAction({
		path: "listMyNotificationsAction",
		safeMessage: "Could not load notifications. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(listMyNotificationsCommandSchema, {
				page: formData.get("page") ?? undefined,
				pageSize: formData.get("pageSize") ?? undefined,
				unreadOnly: formData.get("unreadOnly") ?? undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid notifications page request.",
					parsed.details,
				);
			}

			const result = await listNotifications({
				organizationId: session.orgId,
				userId: session.userId,
				page: parsed.data.page,
				pageSize: parsed.data.pageSize,
				unreadOnly: parsed.data.unreadOnly,
			});
			if (!result.ok) {
				return mapPackageResult(result);
			}
			return mapPackageResult({
				ok: true,
				data: { notifications: result.data },
			});
		},
	});
}
