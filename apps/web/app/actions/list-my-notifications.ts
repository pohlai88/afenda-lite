"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { type Notification, notifications } from "@afenda/notifications";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runMemberSessionAction } from "@/app/actions/run-member-session-action";
import { listMyNotificationsCommandSchema } from "@/modules/identity/schemas/my-notifications";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface ListMyNotificationsActionData {
	notifications: Notification[];
}

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
	return await runMemberSessionAction({
		path: "listMyNotificationsAction",
		safeMessage: "Could not load notifications. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(listMyNotificationsCommandSchema, {
				page: formData.get("page") ?? undefined,
				pageSize: formData.get("pageSize") ?? undefined,
				unreadOnly: formData.get("unreadOnly") ?? undefined,
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid notifications page request.",
				});
			}

			const result = await notifications.inbox.list({
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
