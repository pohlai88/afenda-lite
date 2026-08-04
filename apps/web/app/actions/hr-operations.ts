"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { events } from "@afenda/events";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runHrIntegrationOperatorPermissionAction as runOperatorPermissionAction } from "@/app/actions/_runtime/run-hr-operator-permission-action";
import { parseSchema } from "@/modules/platform/schemas/common";

const retrySchema = z.object({
	eventId: z.string().trim().min(1),
	confirmation: z.literal("RETRY_FAILED_HR_EVENT"),
});

export async function retryFailedHrEventAction(
	_previous: ActionResult<{ eventId: string }> | null,
	formData: FormData,
): Promise<ActionResult<{ eventId: string }>> {
	return await runOperatorPermissionAction({
		path: "retryFailedHrEventAction",
		permission: "human-resources.organization.manage",
		safeMessage: "Could not retry the HR integration event.",
		execute: async (session) => {
			const parsed = parseSchema(retrySchema, {
				eventId: formData.get("eventId"),
				confirmation: formData.get("confirmation"),
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Confirm the failed HR event retry.",
				});
			}

			const target = await events.query.page({
				organizationId: session.orgId,
				id: parsed.data.eventId,
				sourceModule: "human-resources",
				status: "failed",
				page: 1,
				pageSize: 1,
			});
			if (!target.ok || target.data.total !== 1) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Failed HR event not found.",
				});
			}

			const retried = await events.query.retryFailed({
				organizationId: session.orgId,
				id: parsed.data.eventId,
			});
			if (!retried.ok) {
				return retried;
			}

			revalidatePath("/admin/human-resources/operations");
			return { ok: true, data: { eventId: retried.data.id } };
		},
	});
}
