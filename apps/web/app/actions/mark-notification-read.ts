"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { type Notification, notifications } from "@afenda/notifications";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runMemberSessionAction } from "@/app/actions/_runtime/run-member-session-action";
import { markMyNotificationReadCommandSchema } from "@/modules/identity/schemas/my-notifications";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface MarkNotificationReadActionData {
	notification: Notification;
}

/** `null` = form idle (`useActionState`); otherwise API-002 `ActionResult`. */
export type MarkNotificationReadActionState =
	ActionResult<MarkNotificationReadActionData> | null;

/**
 * Mark one inbox item read — ownership enforced by session org + user + id.
 */
export async function markNotificationReadAction(
	_prev: MarkNotificationReadActionState,
	formData: FormData,
): Promise<MarkNotificationReadActionState> {
	return await runMemberSessionAction({
		path: "markNotificationReadAction",
		safeMessage:
			"Could not mark notification read. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(markMyNotificationReadCommandSchema, {
				id: formData.get("id"),
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Select a valid notification.",
				});
			}

			const result = await notifications.inbox.markRead({
				organizationId: session.orgId,
				userId: session.userId,
				id: parsed.data.id,
			});
			if (!result.ok) {
				return mapPackageResult(result);
			}
			if (result.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "That notification was not found for your account.",
				});
			}
			return mapPackageResult({
				ok: true,
				data: { notification: result.data },
			});
		},
	});
}
