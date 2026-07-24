"use server";

import { queryDomainEvents, retryFailedDomainEvent } from "@afenda/events";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

const retrySchema = z.object({
	eventId: z.string().trim().min(1),
	confirmation: z.literal("RETRY_FAILED_HR_EVENT"),
});

export async function retryFailedHrEventAction(
	_previous: ActionResult<{ eventId: string }> | null,
	formData: FormData,
): Promise<ActionResult<{ eventId: string }>> {
	return runOperatorPermissionAction({
		path: "retryFailedHrEventAction",
		permission: "human-resources.organization.manage",
		safeMessage: "Could not retry the HR integration event.",
		execute: async (session) => {
			const parsed = parseSchema(retrySchema, {
				eventId: formData.get("eventId"),
				confirmation: formData.get("confirmation"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Confirm the failed HR event retry.",
					parsed.details,
				);
			}

			const target = await queryDomainEvents({
				organizationId: session.orgId,
				id: parsed.data.eventId,
				sourceModule: "human-resources",
				status: "failed",
				page: 1,
				pageSize: 1,
			});
			if (!target.ok || target.data.total !== 1) {
				return actionFail("NOT_FOUND", "Failed HR event not found.");
			}

			const retried = await retryFailedDomainEvent({
				organizationId: session.orgId,
				id: parsed.data.eventId,
			});
			if (!retried.ok) {
				return actionFail(retried.code, retried.message, retried.details);
			}

			revalidatePath("/admin/human-resources/operations");
			return { ok: true, data: { eventId: retried.data.id } };
		},
	});
}
