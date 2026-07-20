"use server";

import { requireRole } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import { listPartyRoles, type PartyRole } from "@afenda/master-data";
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

export type ListPartyRolesActionData = {
	roles: PartyRole[];
};

const listPartyRolesQuerySchema = z.object({
	partyId: z.string().uuid(),
	page: z.number().int().min(1).optional(),
	pageSize: z.number().int().min(1).max(100).optional(),
});

/**
 * Master-data party role list — session org stamp + `master_data.read`.
 */
export async function listPartyRolesAction(
	input: unknown,
): Promise<ActionResult<ListPartyRolesActionData>> {
	const correlationId = createCorrelationId();
	const session = await requireRole("operator");

	const parsed = parseSchema(listPartyRolesQuerySchema, input);
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Provide a valid party id.",
			parsed.details,
		);
	}

	const permissionDenied = await forbidUnlessPermission(
		session,
		"master_data.read",
	);
	if (permissionDenied) {
		return permissionDenied;
	}

	try {
		const result = await listPartyRoles(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				parentId: parsed.data.partyId,
				page: parsed.data.page,
				pageSize: parsed.data.pageSize,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		const mapped = mapPackageResult(result);
		if (!mapped.ok) {
			return mapped;
		}
		return { ok: true, data: { roles: mapped.data } };
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "listPartyRolesAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Could not list party roles. Try again or contact an admin.",
			correlationId,
		);
	}
}
