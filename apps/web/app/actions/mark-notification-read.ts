"use server";

import { markNotificationRead, type Notification } from "@afenda/notifications";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runMemberSessionAction } from "@/app/actions/run-member-session-action";
import { markMyNotificationReadCommandSchema } from "@/modules/identity/schemas/my-notifications";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type MarkNotificationReadActionData = {
	notification: Notification;
};

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
	return runMemberSessionAction({
		path: "markNotificationReadAction",
		safeMessage:
			"Could not mark notification read. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(markMyNotificationReadCommandSchema, {
				id: formData.get("id"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Select a valid notification.",
					parsed.details,
				);
			}

			const result = await markNotificationRead({
				organizationId: session.orgId,
				userId: session.userId,
				id: parsed.data.id,
			});
			if (!result.ok) {
				return mapPackageResult(result);
			}
			if (result.data === null) {
				return actionFail(
					"NOT_FOUND",
					"That notification was not found for your account.",
				);
			}
			return mapPackageResult({
				ok: true,
				data: { notification: result.data },
			});
		},
	});
}
