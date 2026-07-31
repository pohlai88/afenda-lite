"use server";

import { authServer } from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { http } from "@afenda/http";
import { logger } from "@afenda/logger";
import { type PaymentTerm, updatePaymentTerm } from "@afenda/master-data";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface UpdatePaymentTermActionData {
	paymentTerm: PaymentTerm;
}

export type UpdatePaymentTermActionState =
	ActionResult<UpdatePaymentTermActionData> | null;

const updatePaymentTermFormSchema = z.object({
	paymentTermId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
	name: z.string().trim().min(1).max(200).optional(),
	netDays: z.coerce.number().int().min(0).optional(),
});

/**
 * Master-data payment term update — `expectedVersion` CAS + `master_data.manage`.
 */
export async function updatePaymentTermAction(
	_prev: UpdatePaymentTermActionState,
	formData: FormData,
): Promise<UpdatePaymentTermActionState> {
	const correlationId = http.correlation.create();
	const session = await authServer.session.get();

	const nameRaw = formData.get("name");
	const netDaysRaw = formData.get("netDays");
	const parsed = parseSchema(updatePaymentTermFormSchema, {
		paymentTermId: formData.get("paymentTermId"),
		expectedVersion: formData.get("expectedVersion"),
		name:
			typeof nameRaw === "string" && nameRaw.trim().length > 0
				? nameRaw
				: undefined,
		netDays:
			typeof netDaysRaw === "string" && netDaysRaw.trim().length > 0
				? netDaysRaw
				: undefined,
	});
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage:
				"Provide a valid payment term id, expected version, and fields.",
		});
	}

	const permissionDenied = await forbidUnlessPermission(
		session,
		"master_data.manage",
	);
	if (permissionDenied) {
		return permissionDenied;
	}

	try {
		const result = await updatePaymentTerm(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				id: parsed.data.paymentTermId,
				expectedVersion: parsed.data.expectedVersion,
				name: parsed.data.name,
				netDays: parsed.data.netDays,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		const mapped = mapPackageResult(result);
		if (!mapped.ok) {
			return mapped;
		}
		revalidatePath("/admin/master-data");
		revalidatePath("/client/master-data");
		return { ok: true, data: { paymentTerm: mapped.data } };
	} catch {
		logger.event({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "updatePaymentTermAction",
			code: "INTERNAL_ERROR",
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}
}
