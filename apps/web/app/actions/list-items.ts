"use server";

import { getSession } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import { type Item, listItems } from "@afenda/master-data";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFailInternal,
} from "@/modules/platform/schemas/action-result";

export type ListItemsActionData = {
	items: Item[];
};

/**
 * Master-data item list — session org stamp + `master_data.read`.
 */
export async function listItemsAction(input?: {
	page?: number;
	pageSize?: number;
	status?: Item["status"];
}): Promise<ActionResult<ListItemsActionData>> {
	const correlationId = createCorrelationId();
	const session = await getSession();

	const permissionDenied = await forbidUnlessPermission(
		session,
		"master_data.read",
	);
	if (permissionDenied) {
		return permissionDenied;
	}

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
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "listItemsAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Could not list items. Try again or contact an admin.",
			correlationId,
		);
	}
}
