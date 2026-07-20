"use server";

import { requireRole } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import {
	createPartyRole,
	PARTY_ROLE_CODES,
	type PartyRole,
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

export type CreatePartyRoleActionData = {
	partyRole: PartyRole;
};

export type CreatePartyRoleActionState =
	ActionResult<CreatePartyRoleActionData> | null;

const createPartyRoleFormSchema = z.object({
	partyId: z.string().uuid(),
	roleCode: z.enum(PARTY_ROLE_CODES),
});

/**
 * Master-data party role create — session org stamp + `master_data.manage`.
 * Activation of the party still requires ≥1 active role (package rule).
 */
export async function createPartyRoleAction(
	_prev: CreatePartyRoleActionState,
	formData: FormData,
): Promise<CreatePartyRoleActionState> {
	const correlationId = createCorrelationId();
	const session = await requireRole("operator");

	const parsed = parseSchema(createPartyRoleFormSchema, {
		partyId: formData.get("partyId"),
		roleCode: formData.get("roleCode"),
	});
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Select a valid party and role code.",
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
		const result = await createPartyRole(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				partyId: parsed.data.partyId,
				roleCode: parsed.data.roleCode,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		const mapped = mapPackageResult(result);
		if (!mapped.ok) {
			return mapped;
		}
		revalidatePath("/admin/master-data");
		revalidatePath("/client/master-data");
		return { ok: true, data: { partyRole: mapped.data } };
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "createPartyRoleAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Could not create party role. Try again or contact an admin.",
			correlationId,
		);
	}
}
