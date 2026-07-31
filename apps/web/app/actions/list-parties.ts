"use server";

import { authServer } from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { http } from "@afenda/http";
import { logger } from "@afenda/logger";
import { listParties, type Party } from "@afenda/master-data";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";

export interface ListPartiesActionData {
	parties: Party[];
}

/**
 * Master-data party list — package-authorized and session scoped.
 * Thin adapter; no SQL in the Action.
 */
export async function listPartiesAction(input?: {
	page?: number;
	pageSize?: number;
	status?: Party["status"];
}): Promise<ActionResult<ListPartiesActionData>> {
	const correlationId = http.correlation.create();
	const session = await authServer.session.get();

	try {
		const result = await listParties(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				page: input?.page,
				pageSize: input?.pageSize,
				status: input?.status,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		const mapped = mapPackageResult(result);
		if (!mapped.ok) {
			return mapped;
		}
		return { ok: true, data: { parties: mapped.data } };
	} catch {
		logger.event({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "listPartiesAction",
			code: "INTERNAL_ERROR",
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}
}
