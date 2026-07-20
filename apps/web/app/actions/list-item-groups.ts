"use server";

import { getSession } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import { type ItemGroup, listItemGroups } from "@afenda/master-data";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFailInternal,
} from "@/modules/platform/schemas/action-result";

export type ListItemGroupsActionData = {
	itemGroups: ItemGroup[];
};

/**
 * Master-data item-group list — session org stamp + `master_data.read`.
 */
export async function listItemGroupsAction(input?: {
	page?: number;
	pageSize?: number;
	status?: ItemGroup["status"];
}): Promise<ActionResult<ListItemGroupsActionData>> {
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
		const result = await listItemGroups(
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
		return { ok: true, data: { itemGroups: mapped.data } };
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "listItemGroupsAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Could not list item groups. Try again or contact an admin.",
			correlationId,
		);
	}
}
