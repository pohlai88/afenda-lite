"use server";

import { authServer } from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { http } from "@afenda/http";
import { logger } from "@afenda/logger";
import { type Item, listItems } from "@afenda/master-data";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";

export interface ListItemsActionData {
	items: Item[];
}

/**
 * Master-data item list — package-authorized and session scoped.
 */
export async function listItemsAction(input?: {
	page?: number;
	pageSize?: number;
	status?: Item["status"];
}): Promise<ActionResult<ListItemsActionData>> {
	const correlationId = http.correlation.create();
	const session = await authServer.session.get();

	try {
		const result = await listItems(
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
		return { ok: true, data: { items: mapped.data } };
	} catch {
		logger.event({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "listItemsAction",
			code: "INTERNAL_ERROR",
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}
}
