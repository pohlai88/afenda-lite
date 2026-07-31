"use server";

import { authServer } from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { http } from "@afenda/http";
import { logger } from "@afenda/logger";
import {
	type TaxRegistrationProjection,
	updateTaxRegistration,
} from "@afenda/master-data";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface UpdateTaxRegistrationActionData {
	taxRegistration: TaxRegistrationProjection;
}

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
 * Master-data tax registration update — package-authorized `expectedVersion` CAS.
 */
export async function updateTaxRegistrationAction(
	_prev: UpdateTaxRegistrationActionState,
	formData: FormData,
): Promise<UpdateTaxRegistrationActionState> {
	const correlationId = http.correlation.create();
	const session = await authServer.session.get();

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
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage:
				"Provide a valid tax registration id, expected version, and fields.",
		});
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
					parsed.data.validFrom === undefined
						? undefined
						: new Date(parsed.data.validFrom),
				validTo:
					parsed.data.validTo === undefined
						? undefined
						: new Date(parsed.data.validTo),
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
		logger.event({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "updateTaxRegistrationAction",
			code: "INTERNAL_ERROR",
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}
}
