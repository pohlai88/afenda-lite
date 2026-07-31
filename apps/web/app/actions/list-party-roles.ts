"use server";

import { authServer } from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { http } from "@afenda/http";
import { logger } from "@afenda/logger";
import { listPartyRoles, type PartyRole } from "@afenda/master-data";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface ListPartyRolesActionData {
	roles: PartyRole[];
}

const listPartyRolesQuerySchema = z.object({
	partyId: z.string().uuid(),
	page: z.number().int().min(1).optional(),
	pageSize: z.number().int().min(1).max(100).optional(),
});

/**
 * Master-data party-role list — package-authorized and session scoped.
 */
export async function listPartyRolesAction(
	input: unknown,
): Promise<ActionResult<ListPartyRolesActionData>> {
	const correlationId = http.correlation.create();
	const session = await authServer.session.get();

	const parsed = parseSchema(listPartyRolesQuerySchema, input);
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Provide a valid party id.",
		});
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
		return { ok: true, data: { roles: mapped.data.items } };
	} catch {
		logger.event({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "listPartyRolesAction",
			code: "INTERNAL_ERROR",
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}
}
