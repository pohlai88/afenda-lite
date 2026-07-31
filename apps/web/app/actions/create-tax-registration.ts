"use server";

import { authServer } from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { http } from "@afenda/http";
import { logger } from "@afenda/logger";
import {
	createTaxRegistration,
	getRefCountryByCode,
	type TaxRegistrationProjection,
} from "@afenda/master-data";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface CreateTaxRegistrationActionData {
	taxRegistration: TaxRegistrationProjection;
}

export type CreateTaxRegistrationActionState =
	ActionResult<CreateTaxRegistrationActionData> | null;

const createTaxRegistrationFormSchema = z.object({
	partyId: z.string().uuid(),
	jurisdictionCountryCode: z.string().trim().min(2).max(2),
	registrationType: z.enum(["vat_gst", "tin", "ein_local", "other_gov"]),
	registrationNumber: z.string().trim().min(1).max(128),
	name: z.string().trim().min(1).max(200).optional(),
	validFrom: z.string().trim().optional(),
});

/**
 * Master-data tax registration create — session stamp with package-owned authorization.
 */
export async function createTaxRegistrationAction(
	_prev: CreateTaxRegistrationActionState,
	formData: FormData,
): Promise<CreateTaxRegistrationActionState> {
	const correlationId = http.correlation.create();
	const session = await authServer.session.get();

	const nameRaw = formData.get("name");
	const validFromRaw = formData.get("validFrom");
	const parsed = parseSchema(createTaxRegistrationFormSchema, {
		partyId: formData.get("partyId"),
		jurisdictionCountryCode: formData.get("jurisdictionCountryCode"),
		registrationType: formData.get("registrationType"),
		registrationNumber: formData.get("registrationNumber"),
		name:
			typeof nameRaw === "string" && nameRaw.trim().length > 0
				? nameRaw
				: undefined,
		validFrom:
			typeof validFromRaw === "string" && validFromRaw.trim().length > 0
				? validFromRaw
				: undefined,
	});
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage:
				"Enter a valid party, jurisdiction, type, and registration number.",
		});
	}

	try {
		const country = await getRefCountryByCode(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				code: parsed.data.jurisdictionCountryCode.toUpperCase(),
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		if (!country.ok || country.data === null) {
			return errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Unknown jurisdiction country code.",
			});
		}

		const result = await createTaxRegistration(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				partyId: parsed.data.partyId,
				jurisdictionCountryId: country.data.id,
				registrationType: parsed.data.registrationType,
				registrationNumber: parsed.data.registrationNumber,
				name: parsed.data.name,
				validFrom:
					parsed.data.validFrom === undefined
						? undefined
						: new Date(parsed.data.validFrom),
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
			path: "createTaxRegistrationAction",
			code: "INTERNAL_ERROR",
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}
}
