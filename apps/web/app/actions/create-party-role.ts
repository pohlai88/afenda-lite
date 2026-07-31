"use server";

import { authServer } from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { http } from "@afenda/http";
import { logger } from "@afenda/logger";
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
import { parseSchema } from "@/modules/platform/schemas/common";

export interface CreatePartyRoleActionData {
	partyRole: PartyRole;
}

export type CreatePartyRoleActionState =
	ActionResult<CreatePartyRoleActionData> | null;

const createPartyRoleFormSchema = z.object({
	partyId: z.string().uuid(),
	roleCode: z.enum(PARTY_ROLE_CODES),
});

/**
 * Master-data party role create — session org stamp +
 * `master_data.party_role_manage`.
 * Activation of the party still requires ≥1 active role (package rule).
 */
export async function createPartyRoleAction(
	_prev: CreatePartyRoleActionState,
	formData: FormData,
): Promise<CreatePartyRoleActionState> {
	const correlationId = http.correlation.create();
	const session = await authServer.session.get();

	const parsed = parseSchema(createPartyRoleFormSchema, {
		partyId: formData.get("partyId"),
		roleCode: formData.get("roleCode"),
	});
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Select a valid party and role code.",
		});
	}

	const permissionDenied = await forbidUnlessPermission(
		session,
		"master_data.party_role_manage",
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
		logger.event({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "createPartyRoleAction",
			code: "INTERNAL_ERROR",
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}
}
