"use server";

import { authServer } from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { http } from "@afenda/http";
import { logger } from "@afenda/logger";
import {
	approveChangeRequest,
	type ChangeRequest,
	changeRequestIdSchema,
} from "@afenda/master-data";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface ApproveChangeRequestActionData {
	changeRequest: ChangeRequest;
}

export type ApproveChangeRequestActionState =
	ActionResult<ApproveChangeRequestActionData> | null;

const approveChangeRequestFormSchema = z.object({
	changeRequestId: changeRequestIdSchema,
	expectedVersion: z.coerce.number().int().positive(),
	reviewNote: z.string().trim().min(1).max(500).optional(),
});

/**
 * Approve MDG change request (checker) — `master_data.approve`.
 */
export async function approveChangeRequestAction(
	_prev: ApproveChangeRequestActionState,
	formData: FormData,
): Promise<ApproveChangeRequestActionState> {
	const correlationId = http.correlation.create();
	const session = await authServer.session.get();

	const parsed = parseSchema(approveChangeRequestFormSchema, {
		changeRequestId: formData.get("changeRequestId"),
		expectedVersion: formData.get("expectedVersion"),
		reviewNote: formData.get("reviewNote") || undefined,
	});
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Provide a valid change request id and version.",
		});
	}

	const permissionDenied = await forbidUnlessPermission(
		session,
		"master_data.approve",
	);
	if (permissionDenied) {
		return permissionDenied;
	}

	try {
		const result = await approveChangeRequest(
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
			path: "approveChangeRequestAction",
			code: "INTERNAL_ERROR",
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}
}
