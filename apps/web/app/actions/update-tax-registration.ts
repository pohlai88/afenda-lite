"use server";

import { requireRole } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import {
	type TaxRegistration,
	updateTaxRegistration,
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

export type UpdateTaxRegistrationActionData = {
	taxRegistration: TaxRegistration;
};

export type UpdateTaxRegistrationActionState =
	ActionResult<UpdateTaxRegistrationActionData> | null;

const updateTaxRegistrationFormSchema = z.object({
	taxRegistrationId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
	name: z.string().trim().min(1).max(200).optional(),
	validFrom: z.string().trim().optional(),
	validTo: z.string().trim().optional(),
});

/**
 * Master-data tax registration update — `expectedVersion` CAS + `master_data.manage`.
 */
export async function updateTaxRegistrationAction(
	_prev: UpdateTaxRegistrationActionState,
	formData: FormData,
): Promise<UpdateTaxRegistrationActionState> {
	const correlationId = createCorrelationId();
	const session = await requireRole("operator");

	const nameRaw = formData.get("name");
	const validFromRaw = formData.get("validFrom");
	const validToRaw = formData.get("validTo");
	const parsed = parseSchema(updateTaxRegistrationFormSchema, {
		taxRegistrationId: formData.get("taxRegistrationId"),
		expectedVersion: formData.get("expectedVersion"),
		name:
			typeof nameRaw === "string" && nameRaw.trim().length > 0
				? nameRaw
				: undefined,
		validFrom:
			typeof validFromRaw === "string" && validFromRaw.trim().length > 0
				? validFromRaw
				: undefined,
		validTo:
			typeof validToRaw === "string" && validToRaw.trim().length > 0
				? validToRaw
				: undefined,
	});
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Provide a valid tax registration id, expected version, and fields.",
			parsed.details,
		);
	}

	const permissionDenied = await forbidUnlessPermission(
		session,
		"master_data.manage",
	);
	if (permissionDenied) {
		return permissionDenied;
	}

	try {
		const result = await updateTaxRegistration(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				id: parsed.data.taxRegistrationId,
				expectedVersion: parsed.data.expectedVersion,
				name: parsed.data.name,
				validFrom:
					parsed.data.validFrom !== undefined
						? new Date(parsed.data.validFrom)
						: undefined,
				validTo:
					parsed.data.validTo !== undefined
						? new Date(parsed.data.validTo)
						: undefined,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		const mapped = mapPackageResult(result);
		if (!mapped.ok) {
			return mapped;
		}
		revalidatePath("/admin/master-data");
		revalidatePath("/client/master-data");
		return { ok: true, data: { taxRegistration: mapped.data } };
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "updateTaxRegistrationAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Could not update tax registration. Try again or contact an admin.",
			correlationId,
		);
	}
}
