"use server";

import { getSession } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import {
	createTaxRegistration,
	getRefCountryByCode,
	type TaxRegistration,
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

export type CreateTaxRegistrationActionData = {
	taxRegistration: TaxRegistration;
};

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
 * Master-data tax registration create — session org/actor stamp + `master_data.manage`.
 */
export async function createTaxRegistrationAction(
	_prev: CreateTaxRegistrationActionState,
	formData: FormData,
): Promise<CreateTaxRegistrationActionState> {
	const correlationId = createCorrelationId();
	const session = await getSession();

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
		return actionFail(
			"VALIDATION_ERROR",
			"Enter a valid party, jurisdiction, type, and registration number.",
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
		const country = await getRefCountryByCode(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				code: parsed.data.jurisdictionCountryCode.toUpperCase(),
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		if (!country.ok || country.data === null) {
			return actionFail(
				"VALIDATION_ERROR",
				"Unknown jurisdiction country code.",
			);
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
					parsed.data.validFrom !== undefined
						? new Date(parsed.data.validFrom)
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
			path: "createTaxRegistrationAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Could not create tax registration. Try again or contact an admin.",
			correlationId,
		);
	}
}
