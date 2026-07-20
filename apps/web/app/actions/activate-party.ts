"use server";

import { requireRole } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import {
	activateParty,
	changeRequestIdSchema,
	type Party,
	partyIdSchema,
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

export type ActivatePartyActionData = {
	party: Party;
};

export type ActivatePartyActionState =
	ActionResult<ActivatePartyActionData> | null;

const activatePartyFormSchema = z.object({
	partyId: partyIdSchema,
	expectedVersion: z.coerce.number().int().positive(),
	changeRequestId: changeRequestIdSchema,
});

/**
 * Master-data party activate — approved MDG change request + ≥1 active role.
 */
export async function activatePartyAction(
	_prev: ActivatePartyActionState,
	formData: FormData,
): Promise<ActivatePartyActionState> {
	const correlationId = createCorrelationId();
	const session = await requireRole("operator");

	const parsed = parseSchema(activatePartyFormSchema, {
		partyId: formData.get("partyId"),
		expectedVersion: formData.get("expectedVersion"),
		changeRequestId: formData.get("changeRequestId"),
	});
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Provide a valid party id, expected version, and approved change request.",
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
		const result = await activateParty(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				id: parsed.data.partyId,
				expectedVersion: parsed.data.expectedVersion,
				changeRequestId: parsed.data.changeRequestId,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		const mapped = mapPackageResult(result);
		if (!mapped.ok) {
			return mapped;
		}
		revalidatePath("/admin/master-data");
		revalidatePath("/client/master-data");
		return { ok: true, data: { party: mapped.data } };
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "activatePartyAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Could not activate party. Try again or contact an admin.",
			correlationId,
		);
	}
}
