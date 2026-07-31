"use server";

import { authServer } from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { http } from "@afenda/http";
import { logger } from "@afenda/logger";
import {
	type ChangeRequest,
	changeRequestIdSchema,
	rejectChangeRequest,
} from "@afenda/master-data";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface RejectChangeRequestActionData {
	changeRequest: ChangeRequest;
}

export type RejectChangeRequestActionState =
	ActionResult<RejectChangeRequestActionData> | null;

const rejectChangeRequestFormSchema = z.object({
	changeRequestId: changeRequestIdSchema,
	expectedVersion: z.coerce.number().int().positive(),
	reviewNote: z.string().trim().min(1).max(500).optional(),
});

/**
 * Reject an MDG change request; package authorization owns checker policy.
 */
export async function rejectChangeRequestAction(
	_prev: RejectChangeRequestActionState,
	formData: FormData,
): Promise<RejectChangeRequestActionState> {
	const correlationId = http.correlation.create();
	const session = await authServer.session.get();

	const parsed = parseSchema(rejectChangeRequestFormSchema, {
		changeRequestId: formData.get("changeRequestId"),
		expectedVersion: formData.get("expectedVersion"),
		reviewNote: formData.get("reviewNote") || undefined,
	});
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Provide a valid change request id and version.",
		});
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
		logger.event({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "rejectChangeRequestAction",
			code: "INTERNAL_ERROR",
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}
}
