"use server";

import { getSession } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import {
	type ChangeRequest,
	changeRequestIdSchema,
	rejectChangeRequest,
} from "@afenda/master-data";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFail,
	actionFailInternal,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type RejectChangeRequestActionData = {
	changeRequest: ChangeRequest;
};

export type RejectChangeRequestActionState =
	ActionResult<RejectChangeRequestActionData> | null;

const rejectChangeRequestFormSchema = z.object({
	changeRequestId: changeRequestIdSchema,
	expectedVersion: z.coerce.number().int().positive(),
	reviewNote: z.string().trim().min(1).max(500).optional(),
});

/**
 * Reject MDG change request (checker) — `master_data.approve`.
 */
export async function rejectChangeRequestAction(
	_prev: RejectChangeRequestActionState,
	formData: FormData,
): Promise<RejectChangeRequestActionState> {
	const correlationId = createCorrelationId();
	const session = await getSession();

	const parsed = parseSchema(rejectChangeRequestFormSchema, {
		changeRequestId: formData.get("changeRequestId"),
		expectedVersion: formData.get("expectedVersion"),
		reviewNote: formData.get("reviewNote") || undefined,
	});
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Provide a valid change request id and version.",
			parsed.details,
		);
	}

	const permissionDenied = await forbidUnlessPermission(
		session,
		"master_data.approve",
	);
	if (permissionDenied) {
		return permissionDenied;
	}

	try {
		const result = await rejectChangeRequest(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				id: parsed.data.changeRequestId,
				expectedVersion: parsed.data.expectedVersion,
				reviewNote: parsed.data.reviewNote,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		const mapped = mapPackageResult(result);
		if (!mapped.ok) {
			return mapped;
		}
		revalidatePath("/admin/master-data");
		revalidatePath("/client/master-data");
		return { ok: true, data: { changeRequest: mapped.data } };
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "rejectChangeRequestAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Could not reject change request. Try again or contact an admin.",
			correlationId,
		);
	}
}
